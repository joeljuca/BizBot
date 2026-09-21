import axios from "axios";
import * as cheerio from "cheerio";
import type { RawItem, ScrapeResult, SourceConfig } from "@/types";
import { config } from "@/lib/config";

// ── Helpers ───────────────────────────────────────────

function resolveUrl(href: string, baseUrl?: string): string {
  if (href.startsWith("http")) return href;
  if (!baseUrl) return href;
  return `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
}

function extractNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((o, key) => o?.[key], obj);
}

function parseNumber(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const num = parseInt(val.replace(/[^0-9-]/g, ""), 10);
  return isNaN(num) ? undefined : num;
}

const client = axios.create({
  timeout: config.scraper.timeout,
  headers: {
    "User-Agent": config.scraper.userAgent,
    Accept: "text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
});

// ── Reddit Scraper ────────────────────────────────────

async function scrapeReddit(source: SourceConfig): Promise<RawItem[]> {
  const resp = await client.get(source.url, {
    headers: { "User-Agent": config.scraper.userAgent },
  });
  const children = resp.data?.data?.children ?? [];

  return children.slice(0, config.scraper.maxItemsPerSource).map((child: any) => {
    const d = child.data;
    return {
      externalId: d.id,
      title: d.title,
      url: `https://www.reddit.com${d.permalink}`,
      summary: d.selftext?.slice(0, 500) || undefined,
      author: d.author,
      publishedAt: new Date(d.created_utc * 1000),
      score: d.score,
      commentCount: d.num_comments,
      tags: d.link_flair_text ? [d.link_flair_text] : undefined,
    } satisfies RawItem;
  });
}

// ── Hacker News Scraper ───────────────────────────────

async function scrapeHackerNews(source: SourceConfig): Promise<RawItem[]> {
  const resp = await client.get(source.url);
  const ids: number[] = resp.data?.slice(0, config.scraper.maxItemsPerSource) ?? [];

  const items = await Promise.all(
    ids.map(async (id) => {
      try {
        const itemResp = await client.get(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`
        );
        const d = itemResp.data;
        if (!d || d.dead || d.deleted) return null;
        return {
          externalId: String(d.id),
          title: d.title,
          url: d.url || `https://news.ycombinator.com/item?id=${d.id}`,
          author: d.by,
          publishedAt: new Date(d.time * 1000),
          score: d.score,
          commentCount: d.descendants,
        } satisfies RawItem;
      } catch {
        return null;
      }
    })
  );

  return items.filter(Boolean) as RawItem[];
}

// ── Generic HTML Scraper ──────────────────────────────

async function scrapeHtml(source: SourceConfig): Promise<RawItem[]> {
  const resp = await client.get(source.url);
  const $ = cheerio.load(resp.data);
  const items: RawItem[] = [];

  $(source.selector.item).each((_, el) => {
    if (items.length >= config.scraper.maxItemsPerSource) return false;

    const $el = $(el);

    // Title
    const titleEl = source.selector.title
      .split(", ")
      .map((s) => $el.find(s).first())
      .find(($t) => $t.text().trim());
    const title = titleEl?.text().trim() || "";
    if (!title) return;

    // Link
    const linkEl = source.selector.link
      .split(", ")
      .map((s) => $el.find(s).first())
      .find(($l) => $l.attr("href"));
    const href = linkEl?.attr("href") || "";
    const url = resolveUrl(href, source.baseUrl);
    if (!url || url === source.baseUrl) return;

    // Summary
    let summary: string | undefined;
    if (source.selector.summary) {
      for (const sel of source.selector.summary.split(", ")) {
        const text = $el.find(sel).first().text().trim();
        if (text) {
          summary = text.slice(0, 500);
          break;
        }
      }
    }

    // Author
    let author: string | undefined;
    if (source.selector.author) {
      for (const sel of source.selector.author.split(", ")) {
        const text = $el.find(sel).first().text().trim();
        if (text) {
          author = text;
          break;
        }
      }
    }

    // Score
    let score: number | undefined;
    if (source.selector.score) {
      for (const sel of source.selector.score.split(", ")) {
        const text = $el.find(sel).first().text().trim();
        const num = parseNumber(text);
        if (num !== undefined) {
          score = num;
          break;
        }
      }
    }

    // Comment count
    let commentCount: number | undefined;
    if (source.selector.commentCount) {
      for (const sel of source.selector.commentCount.split(", ")) {
        const text = $el.find(sel).first().text().trim();
        const num = parseNumber(text);
        if (num !== undefined) {
          commentCount = num;
          break;
        }
      }
    }

    items.push({
      title,
      url,
      summary,
      author,
      score,
      commentCount,
    });
  });

  return items;
}

// ── Dispatcher ────────────────────────────────────────

async function scrapeSource(source: SourceConfig): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    sourceUrl: source.url,
    sourceName: source.name,
    items: [],
    scrapedAt: new Date(),
    errors: [],
  };

  try {
    if (source.type === "subreddit") {
      result.items = await scrapeReddit(source);
    } else if (source.url.includes("hacker-news.firebaseio.com")) {
      result.items = await scrapeHackerNews(source);
    } else {
      result.items = await scrapeHtml(source);
    }
  } catch (err: any) {
    const msg = `Failed to scrape ${source.name}: ${err.message}`;
    console.error(`❌ ${msg}`);
    result.errors?.push(msg);
  }

  return result;
}

// ── Public API ────────────────────────────────────────

export async function scanAllSources(
  sources: SourceConfig[]
): Promise<ScrapeResult[]> {
  console.log(`🔍 Starting scan of ${sources.length} sources...`);

  // Run in batches of 4 to avoid overwhelming
  const batchSize = 4;
  const results: ScrapeResult[] = [];

  for (let i = 0; i < sources.length; i += batchSize) {
    const batch = sources.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(scrapeSource));
    results.push(...batchResults);

    // Brief pause between batches
    if (i + batchSize < sources.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);
  const errors = results.filter((r) => r.errors && r.errors.length > 0);
  console.log(
    `✅ Scan complete: ${totalItems} items from ${results.length} sources` +
      (errors.length ? ` (${errors.length} sources had errors)` : "")
  );

  return results;
}
