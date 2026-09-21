import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import * as cron from "node-cron";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { scanAllSources } from "@/scraper/engine";
import { BUSINESS_SOURCES } from "@/scraper/sources";
import { analyzeBatched } from "@/analyzer/opportunity";
import {
  buildTodaysBriefings,
  formatBriefing,
  formatDigestHeader,
  formatDigestFooter,
  storeDigest,
} from "@/digest/builder";
import { format } from "date-fns";
import type { RawItem } from "@/types";

// ── Bot Setup ─────────────────────────────────────────

if (!config.telegram.token) {
  console.error("❌ TELEGRAM_BOT_TOKEN is required. Set it in .env");
  process.exit(1);
}

const bot = new Telegraf(config.telegram.token);

// ── Helpers ───────────────────────────────────────────

async function getActiveSubscribers() {
  return db.subscriber.findMany({ where: { active: true } });
}

async function sendToSubscribers(text: string) {
  const subscribers = await getActiveSubscribers();
  let sent = 0;
  for (const sub of subscribers) {
    try {
      await bot.telegram.sendMessage(sub.chatId, text, {
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      });
      sent++;
    } catch (err: any) {
      console.error(`Failed to send to ${sub.chatId}: ${err.message}`);
      // If bot was blocked, deactivate subscriber
      if (err.response?.error_code === 403) {
        await db.subscriber.update({
          where: { chatId: sub.chatId },
          data: { active: false },
        });
      }
    }
  }
  return sent;
}

// ── Core: Scan & Analyze Pipeline ─────────────────────

async function runScanPipeline(ctx?: Context) {
  const chatId = ctx?.chat?.id?.toString();
  const notify = (text: string) =>
    chatId
      ? bot.telegram.sendMessage(chatId, text, { parse_mode: "Markdown" })
      : Promise.resolve();

  await notify("🔍 Starting scan...");

  // 1. Scrape all sources
  const results = await scanAllSources(BUSINESS_SOURCES);
  const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);
  const errors = results.filter((r) => r.errors && r.errors.length > 0);

  await notify(
    `📥 Scraped **${totalItems}** items from **${results.length}** sources` +
      (errors.length ? ` (${errors.length} with errors)` : "")
  );

  // 2. Upsert sources and save items
  let newItems = 0;
  for (const result of results) {
    const source = await db.source.upsert({
      where: { url: result.sourceUrl },
      create: {
        name: result.sourceName,
        url: result.sourceUrl,
        type: BUSINESS_SOURCES.find((s) => s.url === result.sourceUrl)?.type || "forum",
        category:
          BUSINESS_SOURCES.find((s) => s.url === result.sourceUrl)?.category || "general",
      },
      update: { lastScanned: new Date() },
    });

    for (const item of result.items) {
      try {
        await db.item.upsert({
          where: { url: item.url },
          create: {
            externalId: item.externalId,
            title: item.title,
            url: item.url,
            summary: item.summary,
            fullText: item.fullText,
            author: item.author,
            publishedAt: item.publishedAt,
            score: item.score,
            commentCount: item.commentCount,
            tags: item.tags ? JSON.stringify(item.tags) : null,
            sourceId: source.id,
          },
          update: {
            score: item.score,
            commentCount: item.commentCount,
            summary: item.summary || undefined,
          },
        });
        newItems++;
      } catch (e: any) {
        // Duplicate URL — skip
        if (!e.message?.includes("Unique constraint")) {
          console.error(`Item save error: ${e.message}`);
        }
      }
    }
  }

  await notify(`💾 Saved/updated **${newItems}** items in database.`);

  // 3. Analyze unanalyzed items
  const unanalyzed = await db.item.findMany({
    where: { analysis: null },
    orderBy: { score: "desc" },
    take: 50, // analyze top 50 per run
  });

  if (unanalyzed.length > 0) {
    await notify(`🧠 Analyzing **${unanalyzed.length}** items with AI...`);

    const analyses = await analyzeBatched(
      unanalyzed.map((item) => ({
        title: item.title,
        url: item.url,
        summary: item.summary || undefined,
        score: item.score || undefined,
        commentCount: item.commentCount || undefined,
      })),
      config.analysis.batchSize
    );

    let analyzed = 0;
    for (const item of unanalyzed) {
      const analysis = analyses.get(item.url);
      if (analysis) {
        await db.analysis.create({
          data: {
            itemId: item.id,
            opportunityType: analysis.opportunityType,
            score: analysis.score,
            reasoning: analysis.reasoning,
            targetAudience: analysis.targetAudience,
            marketSize: analysis.marketSize,
            keyInsight: analysis.keyInsight,
            actionable: analysis.actionable,
            tags: analysis.tags ? JSON.stringify(analysis.tags) : null,
          },
        });
        analyzed++;
      }
    }

    await notify(`✅ Analysis complete: **${analyzed}** opportunities identified.`);
  } else {
    await notify("ℹ️ No new items to analyze.");
  }

  return { totalItems, newItems };
}

// ── Core: Send Digest ─────────────────────────────────

async function runDigest(ctx?: Context) {
  const chatId = ctx?.chat?.id?.toString();

  const briefings = await buildTodaysBriefings();

  if (briefings.length === 0) {
    const msg = "📭 No high-scoring opportunities found today. Try running /scan first.";
    if (chatId) {
      await bot.telegram.sendMessage(chatId, msg);
    }
    return;
  }

  const dateStr = format(new Date(), "EEEE, MMMM d, yyyy");
  const header = formatDigestHeader(dateStr, briefings.length, briefings.length);

  // Send header
  if (chatId) {
    await bot.telegram.sendMessage(chatId, header, { parse_mode: "Markdown" });
  } else {
    await sendToSubscribers(header);
  }

  // Send each briefing as a separate message (for readability)
  for (const briefing of briefings) {
    const text = formatBriefing(briefing, briefing.rank);
    if (chatId) {
      await bot.telegram.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      });
    } else {
      await sendToSubscribers(text);
    }
    // Small delay to respect rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  // Footer
  const footer = formatDigestFooter();
  if (chatId) {
    await bot.telegram.sendMessage(chatId, footer, { parse_mode: "Markdown" });
  } else {
    await sendToSubscribers(footer);
  }

  // Store in DB
  await storeDigest(briefings, dateStr);
}

// ── Commands ──────────────────────────────────────────

bot.start(async (ctx) => {
  const chatId = ctx.chat.id.toString();

  await db.subscriber.upsert({
    where: { chatId },
    create: {
      chatId,
      username: ctx.from?.username,
    },
    update: { active: true },
  });

  await ctx.reply(
    `👋 Welcome to **BizScanner** — your daily business opportunity radar!\n\n` +
      `I scan ${BUSINESS_SOURCES.length} top business forums, blogs, and communities ` +
      `to find new opportunities, then deliver a daily digest.\n\n` +
      `**Commands:**\n` +
      `/scan — Run an immediate scan\n` +
      `/digest — Get today's digest\n` +
      `/top — Quick top 5 opportunities\n` +
      `/sources — List monitored sources\n` +
      `/stop — Unsubscribe\n\n` +
      `You're now subscribed! You'll receive a daily digest automatically.`,
    { parse_mode: "Markdown" }
  );
});

bot.command("scan", async (ctx) => {
  try {
    await runScanPipeline(ctx);
  } catch (err: any) {
    await ctx.reply(`❌ Scan failed: ${err.message}`);
  }
});

bot.command("digest", async (ctx) => {
  try {
    await runDigest(ctx);
  } catch (err: any) {
    await ctx.reply(`❌ Digest failed: ${err.message}`);
  }
});

bot.command("top", async (ctx) => {
  try {
    const briefings = await buildTodaysBriefings();
    if (briefings.length === 0) {
      await ctx.reply("📭 No opportunities found yet. Run /scan first!");
      return;
    }

    const top5 = briefings.slice(0, 5);
    let msg = `🏆 **Top ${top5.length} Opportunities Today**\n\n`;

    for (const b of top5) {
      msg += formatBriefing(b, b.rank) + "\n\n";
    }

    await ctx.reply(msg, { parse_mode: "Markdown", disable_web_page_preview: true });
  } catch (err: any) {
    await ctx.reply(`❌ Error: ${err.message}`);
  }
});

bot.command("sources", async (ctx) => {
  let msg = `📡 **Monitored Sources (${BUSINESS_SOURCES.length})**\n\n`;

  const grouped = BUSINESS_SOURCES.reduce(
    (acc, s) => {
      (acc[s.category] ??= []).push(s);
      return acc;
    },
    {} as Record<string, typeof BUSINESS_SOURCES>
  );

  for (const [cat, sources] of Object.entries(grouped)) {
    msg += `**${cat.toUpperCase()}**\n`;
    for (const s of sources) {
      msg += `  • ${s.name}\n`;
    }
    msg += "\n";
  }

  await ctx.reply(msg, { parse_mode: "Markdown" });
});

bot.command("stop", async (ctx) => {
  const chatId = ctx.chat.id.toString();
  await db.subscriber.update({
    where: { chatId },
    data: { active: false },
  });
  await ctx.reply("👋 You've been unsubscribed. Use /start to resubscribe anytime.");
});

// ── Scheduled Jobs ────────────────────────────────────

if (cron.validate(config.scan.cron)) {
  cron.schedule(config.scan.cron, async () => {
    console.log("⏰ Scheduled scan starting...");
    try {
      await runScanPipeline();
    } catch (err: any) {
      console.error(`Scheduled scan failed: ${err.message}`);
    }
  });
  console.log(`📅 Scan scheduled: ${config.scan.cron}`);
}

if (cron.validate(config.digest.cron)) {
  cron.schedule(
    config.digest.cron,
    async () => {
      console.log("⏰ Scheduled digest starting...");
      try {
        await runDigest();
      } catch (err: any) {
        console.error(`Scheduled digest failed: ${err.message}`);
      }
    },
    { timezone: config.digest.timezone }
  );
  console.log(`📅 Digest scheduled: ${config.digest.cron} (${config.digest.timezone})`);
}

// ── Launch ────────────────────────────────────────────

async function main() {
  console.log("🤖 BizScanner Bot starting...");

  // Register sources in DB
  for (const source of BUSINESS_SOURCES) {
    await db.source.upsert({
      where: { url: source.url },
      create: {
        name: source.name,
        url: source.url,
        type: source.type,
        category: source.category,
      },
      update: { name: source.name },
    });
  }

  bot.launch();
  console.log("✅ Bot is running! Press Ctrl+C to stop.");

  // Graceful shutdown
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
