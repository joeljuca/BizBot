import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { format } from "date-fns";
import type { DigestBriefing, OpportunityAnalysis, OpportunityType } from "@/types";

// ── Emoji map for opportunity types ───────────────────

const TYPE_EMOJI: Record<OpportunityType, string> = {
  market_gap: "🕳️",
  trending: "📈",
  underserved: "🎯",
  emerging_tech: "🚀",
  regulation_change: "⚖️",
  consumer_shift: "🔄",
};

const TYPE_LABELS: Record<OpportunityType, string> = {
  market_gap: "Market Gap",
  trending: "Trending",
  underserved: "Underserved Market",
  emerging_tech: "Emerging Tech",
  regulation_change: "Regulation Change",
  consumer_shift: "Consumer Shift",
};

// ── Score bar visual ──────────────────────────────────

function scoreBar(score: number): string {
  const filled = Math.round(score);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function scoreBadge(score: number): string {
  if (score >= 8) return "🔥 HOT";
  if (score >= 6) return "⭐ STRONG";
  return "💡 WORTH A LOOK";
}

// ── Build Telegram message for a single briefing ──────

export function formatBriefing(briefing: DigestBriefing, rank: number): string {
  const emoji = TYPE_EMOJI[briefing.opportunityType] || "💡";
  const label = TYPE_LABELS[briefing.opportunityType] || "Opportunity";

  let msg = "";
  msg += `${emoji} **#${rank} — ${briefing.title}**\n`;
  msg += `_${label} · Score ${briefing.score.toFixed(1)}/10 ${scoreBadge(briefing.score)}_\n\n`;
  msg += `${briefing.keyInsight}\n\n`;

  if (briefing.actionable) {
    msg += `📌 **Action:** ${briefing.actionable}\n\n`;
  }

  msg += `🔗 [Read full discussion →](${briefing.url})\n`;
  msg += `📡 Source: ${briefing.source}`;

  return msg;
}

// ── Build the full daily digest message ───────────────

export function formatDigestHeader(date: string, totalScanned: number, oppCount: number): string {
  return (
    `📊 **Daily Business Opportunities Digest**\n` +
    `📅 ${date}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Scanned **${totalScanned}** posts across **${config.analysis.maxDigestItems}** sources.\n` +
    `Found **${oppCount}** opportunities scoring ${config.analysis.minScore}+.\n\n`
  );
}

export function formatDigestFooter(): string {
  return (
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 _Tip: Opportunities are scored by AI based on market potential, novelty, and actionability._\n` +
    `🔄 _Next scan scheduled per your configured interval._\n\n` +
    `Commands:\n` +
    `/scan — Run an immediate scan\n` +
    `/top — See today's top opportunities\n` +
    `/sources — List monitored sources\n` +
    `/stop — Unsubscribe from digests`
  );
}

// ── Store digest in DB ────────────────────────────────

export async function storeDigest(
  briefings: DigestBriefing[],
  dateStr: string
): Promise<string> {
  const digest = await db.digest.create({
    data: {
      title: `Daily Digest — ${dateStr}`,
      summary: `${briefings.length} opportunities identified`,
    },
  });

  // Link items to digest
  for (const b of briefings) {
    const item = await db.item.findUnique({ where: { url: b.url } });
    if (item) {
      await db.digestItem.create({
        data: {
          digestId: digest.id,
          itemId: item.id,
          rank: b.rank,
        },
      });
    }
  }

  // Mark as sent
  await db.digest.update({
    where: { id: digest.id },
    data: { sentAt: new Date() },
  });

  return digest.id;
}

// ── Build briefings from DB ───────────────────────────

export async function buildTodaysBriefings(): Promise<DigestBriefing[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const analyses = await db.analysis.findMany({
    where: {
      score: { gte: config.analysis.minScore },
      createdAt: { gte: today },
    },
    orderBy: { score: "desc" },
    take: config.analysis.maxDigestItems,
    include: {
      item: {
        include: { source: true },
      },
    },
  });

  return analyses.map((a, i) => ({
    rank: i + 1,
    title: a.item.title,
    url: a.item.url,
    source: a.item.source.name,
    keyInsight: a.keyInsight,
    opportunityType: a.opportunityType as OpportunityType,
    score: a.score,
    summary: a.item.summary || a.reasoning,
    actionable: a.actionable || undefined,
  }));
}
