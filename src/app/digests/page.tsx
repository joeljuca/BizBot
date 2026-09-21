import { db } from "@/lib/db";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DigestsPage() {
  const digests = await db.digest.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      items: {
        include: {
          item: { include: { source: true, analysis: true } },
        },
        orderBy: { rank: "asc" },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Past Digests</h1>
        <p className="text-gray-400">Previously generated daily opportunity digests</p>
      </div>

      {digests.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">📊</div>
          <p>No digests generated yet.</p>
          <p className="text-sm mt-2">
            Digestes are sent daily via Telegram after scanning.
          </p>
        </div>
      ) : (
        digests.map((digest) => (
          <article
            key={digest.id}
            className="p-5 rounded-lg bg-gray-800/50 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{digest.title}</h2>
              <span className="text-xs text-gray-500">
                {digest.sentAt
                  ? `Sent ${format(digest.sentAt, "MMM d, yyyy HH:mm")}`
                  : "Not sent"}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-4">{digest.summary}</p>

            {digest.items.length > 0 && (
              <div className="space-y-2">
                {digest.items.map((di) => (
                  <a
                    key={di.id}
                    href={di.item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded bg-gray-900/50 hover:bg-gray-900 transition"
                  >
                    <span className="text-sm font-bold text-gray-500 w-6 text-right">
                      #{di.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {di.item.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {di.item.source.name}
                        {di.item.analysis && (
                          <> · Score: {di.item.analysis.score.toFixed(1)}</>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}
