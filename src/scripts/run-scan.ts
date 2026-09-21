/**
 * Standalone scan script — run without starting the Telegram bot.
 * Usage: npx tsx src/scripts/run-scan.ts
 */

import "dotenv/config";
import { db } from "@/lib/db";
import { scanAllSources } from "@/scraper/engine";
import { BUSINESS_SOURCES } from "@/scraper/sources";
import { analyzeBatched } from "@/analyzer/opportunity";
import { config } from "@/lib/config";

async function main() {
  console.log("🔍 BizScanner — Standalone Scan\n");

  // 1. Scrape
  const results = await scanAllSources(BUSINESS_SOURCES);
  const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);

  // 2. Save
  let saved = 0;
  for (const result of results) {
    const source = await db.source.upsert({
      where: { url: result.sourceUrl },
      create: {
        name: result.sourceName,
        url: result.sourceUrl,
        type: "forum",
        category: "general",
      },
      update: { lastScanned: new Date() },
    });

    for (const item of result.items) {
      try {
        await db.item.upsert({
          where: { url: item.url },
          create: {
            title: item.title,
            url: item.url,
            summary: item.summary,
            author: item.author,
            publishedAt: item.publishedAt,
            score: item.score,
            commentCount: item.commentCount,
            sourceId: source.id,
          },
          update: {},
        });
        saved++;
      } catch {
        // duplicate
      }
    }
  }

  console.log(`\n💾 Saved ${saved} items to database.`);

  // 3. Analyze
  const unanalyzed = await db.item.findMany({
    where: { analysis: null },
    orderBy: { score: "desc" },
    take: 30,
  });

  if (unanalyzed.length > 0) {
    console.log(`\n🧠 Analyzing ${unanalyzed.length} items...`);
    const analyses = await analyzeBatched(
      unanalyzed.map((i) => ({
        title: i.title,
        url: i.url,
        summary: i.summary || undefined,
        score: i.score || undefined,
      })),
      config.analysis.batchSize
    );

    let analyzed = 0;
    for (const item of unanalyzed) {
      const a = analyses.get(item.url);
      if (a) {
        await db.analysis.create({
          data: {
            itemId: item.id,
            opportunityType: a.opportunityType,
            score: a.score,
            reasoning: a.reasoning,
            keyInsight: a.keyInsight,
            actionable: a.actionable,
            targetAudience: a.targetAudience,
            marketSize: a.marketSize,
            tags: a.tags ? JSON.stringify(a.tags) : null,
          },
        });
        analyzed++;
      }
    }
    console.log(`✅ Analyzed ${analyzed} opportunities.`);
  }

  console.log("\n🎉 Scan complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
