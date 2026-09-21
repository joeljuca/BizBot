/**
 * Standalone digest script — generate and print today's digest.
 * Usage: npx tsx src/scripts/run-digest.ts
 */

import "dotenv/config";
import { buildTodaysBriefings, formatBriefing, formatDigestHeader, formatDigestFooter } from "@/digest/builder";
import { format } from "date-fns";

async function main() {
  console.log("📊 BizScanner — Daily Digest Generator\n");

  const briefings = await buildTodaysBriefings();

  if (briefings.length === 0) {
    console.log("📭 No high-scoring opportunities found. Run a scan first.");
    process.exit(0);
  }

  const dateStr = format(new Date(), "EEEE, MMMM d, yyyy");

  // Print header
  console.log(formatDigestHeader(dateStr, briefings.length, briefings.length));

  // Print each briefing
  for (const b of briefings) {
    console.log(formatBriefing(b, b.rank));
    console.log("---");
  }

  // Footer
  console.log(formatDigestFooter());

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
