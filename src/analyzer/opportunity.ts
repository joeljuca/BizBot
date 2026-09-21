import { openai, ANALYSIS_MODEL } from "@/lib/openai";
import type { OpportunityAnalysis } from "@/types";

const ANALYSIS_PROMPT = `You are a business opportunity analyst. Analyze the following content from a business discussion site and extract potential business opportunities.

For each item, determine:
1. **opportunityType** — one of: market_gap, trending, underserved, emerging_tech, regulation_change, consumer_shift
2. **score** — 0 to 10 (how promising/actionable is this opportunity?)
3. **reasoning** — brief explanation of why this is (or isn't) an opportunity
4. **targetAudience** — who would benefit or buy
5. **marketSize** — rough estimate (tiny/niche/small/medium/large/huge)
6. **keyInsight** — the core takeaway in one sentence
7. **actionable** — what someone could actually do about it
8. **tags** — 2-5 relevant tags

Only return items scoring 5+ that represent genuine opportunities. Skip generic advice, complaints, or purely informational posts.

Respond with a JSON array. If no opportunities found, return an empty array [].`;

interface AnalyzableItem {
  title: string;
  url: string;
  summary?: string;
  score?: number;
  commentCount?: number;
}

/**
 * Analyze a batch of items for business opportunities.
 * Returns only items that score above the threshold.
 */
export async function analyzeOpportunities(
  items: AnalyzableItem[]
): Promise<Map<string, OpportunityAnalysis>> {
  const results = new Map<string, OpportunityAnalysis>();

  if (!openai) {
    console.warn("⚠️  OpenAI not configured — skipping analysis");
    return results;
  }

  if (items.length === 0) return results;

  // Build a compact representation for the prompt
  const itemDescriptions = items
    .map(
      (item, i) =>
        `[${i}] "${item.title}"\nURL: ${item.url}\n` +
        (item.summary ? `Summary: ${item.summary.slice(0, 300)}\n` : "") +
        (item.score ? `Community score: ${item.score}\n` : "") +
        (item.commentCount ? `Comments: ${item.commentCount}\n` : "")
    )
    .join("\n---\n");

  try {
    const response = await openai.chat.completions.create({
      model: ANALYSIS_MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ANALYSIS_PROMPT },
        {
          role: "user",
          content: `Analyze these ${items.length} items for business opportunities:\n\n${itemDescriptions}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return results;

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse analysis JSON");
      return results;
    }

    // Handle both { "items": [...] } and [...] formats
    const analyses: any[] = Array.isArray(parsed) ? parsed : parsed.items || parsed.opportunities || [];

    for (const analysis of analyses) {
      const idx = analysis.index ?? analysis.itemIndex ?? analysis.id;
      if (idx === undefined || idx < 0 || idx >= items.length) continue;

      const item = items[idx];
      if (!item) continue;

      const opp: OpportunityAnalysis = {
        opportunityType: analysis.opportunityType || analysis.type || "market_gap",
        score: Math.min(10, Math.max(0, analysis.score || 0)),
        reasoning: analysis.reasoning || "",
        targetAudience: analysis.targetAudience,
        marketSize: analysis.marketSize,
        keyInsight: analysis.keyInsight || analysis.insight || "",
        actionable: analysis.actionable,
        tags: Array.isArray(analysis.tags) ? analysis.tags : undefined,
      };

      results.set(item.url, opp);
    }
  } catch (err: any) {
    console.error(`❌ Analysis failed: ${err.message}`);
  }

  return results;
}

/**
 * Analyze items in batches to avoid token limits
 */
export async function analyzeBatched(
  items: AnalyzableItem[],
  batchSize: number = 5
): Promise<Map<string, OpportunityAnalysis>> {
  const allResults = new Map<string, OpportunityAnalysis>();

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await analyzeOpportunities(batch);

    for (const [url, analysis] of batchResults) {
      allResults.set(url, analysis);
    }

    // Rate limit courtesy
    if (i + batchSize < items.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return allResults;
}
