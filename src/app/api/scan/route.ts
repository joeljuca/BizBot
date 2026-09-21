import { NextResponse } from "next/server";
import { scanAllSources } from "@/scraper/engine";
import { BUSINESS_SOURCES } from "@/scraper/sources";
import { analyzeBatched } from "@/analyzer/opportunity";
import { db } from "@/lib/db";
import { config } from "@/lib/config";

export async function POST() {
  try {
    // 1. Scrape
    const results = await scanAllSources(BUSINESS_SOURCES);
    const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);

    // 2. Save items
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

    // 3. Analyze
    const unanalyzed = await db.item.findMany({
      where: { analysis: null },
      orderBy: { score: "desc" },
      take: 30,
    });

    let analyzed = 0;
    if (unanalyzed.length > 0) {
      const analyses = await analyzeBatched(
        unanalyzed.map((i) => ({
          title: i.title,
          url: i.url,
          summary: i.summary || undefined,
          score: i.score || undefined,
        })),
        config.analysis.batchSize
      );

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
    }

    return NextResponse.json({
      success: true,
      scanned: totalItems,
      saved,
      analyzed,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
