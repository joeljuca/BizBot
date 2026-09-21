export const config = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || "",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },
  scan: {
    cron: process.env.SCAN_CRON || "0 */6 * * *", // every 6 hours
  },
  digest: {
    cron: process.env.DIGEST_CRON || "0 8 * * *", // 8am daily
    timezone: process.env.DIGEST_TIMEZONE || "UTC",
  },
  scraper: {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    timeout: 15000,
    maxItemsPerSource: 20,
  },
  analysis: {
    batchSize: 5,
    minScore: 5, // minimum score to include in digest
    maxDigestItems: 10,
  },
} as const;
