// ── Scraper Types ─────────────────────────────────────

export interface RawItem {
  externalId?: string;
  title: string;
  url: string;
  summary?: string;
  fullText?: string;
  author?: string;
  publishedAt?: Date;
  score?: number;
  commentCount?: number;
  tags?: string[];
}

export interface ScrapeResult {
  sourceUrl: string;
  sourceName: string;
  items: RawItem[];
  scrapedAt: Date;
  errors?: string[];
}

// ── Analysis Types ────────────────────────────────────

export type OpportunityType =
  | "market_gap"
  | "trending"
  | "underserved"
  | "emerging_tech"
  | "regulation_change"
  | "consumer_shift";

export interface OpportunityAnalysis {
  opportunityType: OpportunityType;
  score: number; // 0-10
  reasoning: string;
  targetAudience?: string;
  marketSize?: string;
  keyInsight: string;
  actionable?: string;
  tags?: string[];
}

// ── Digest Types ──────────────────────────────────────

export interface DigestBriefing {
  rank: number;
  title: string;
  url: string;
  source: string;
  keyInsight: string;
  opportunityType: OpportunityType;
  score: number;
  summary: string;
  actionable?: string;
}

export interface DailyDigest {
  title: string;
  date: string;
  totalScanned: number;
  topOpportunities: DigestBriefing;
  allBriefings: DigestBriefing[];
  summary: string;
}

// ── Source Config ─────────────────────────────────────

export interface SourceConfig {
  name: string;
  url: string;
  type: "forum" | "blog" | "news" | "subreddit" | "product";
  category: string;
  selector: {
    item: string;
    title: string;
    link: string;
    summary?: string;
    author?: string;
    score?: string;
    commentCount?: string;
  };
  baseUrl?: string;
}
