import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const opportunities = await db.analysis.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { item: { include: { source: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Opportunities</h1>
        <p className="text-gray-400">All AI-analyzed business opportunities</p>
      </div>

      {opportunities.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">📭</div>
          <p>No opportunities analyzed yet.</p>
          <p className="text-sm mt-2">
            Run <code className="bg-gray-800 px-2 py-0.5 rounded">/scan</code> in
            Telegram to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((a) => (
            <article
              key={a.id}
              className="p-5 rounded-lg bg-gray-800/50 border border-gray-700 card-hover"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg leading-tight">
                    <a
                      href={a.item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-400 transition"
                    >
                      {a.item.title}
                    </a>
                  </h2>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                    <span>📡 {a.item.source.name}</span>
                    <span className="tag-pill capitalize">
                      {a.opportunityType.replace(/_/g, " ")}
                    </span>
                    {a.marketSize && (
                      <span className="tag-pill">Market: {a.marketSize}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-3xl font-bold text-blue-400">
                    {a.score.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">/ 10</div>
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-300">{a.keyInsight}</p>

              {a.reasoning && (
                <p className="mt-2 text-xs text-gray-500">{a.reasoning}</p>
              )}

              {a.actionable && (
                <div className="mt-3 p-3 rounded bg-gray-900/50 border border-gray-700">
                  <span className="text-xs font-semibold text-green-400">
                    📌 Action:
                  </span>
                  <span className="text-xs text-gray-300 ml-2">{a.actionable}</span>
                </div>
              )}

              {a.targetAudience && (
                <div className="mt-2 text-xs text-gray-500">
                  🎯 Target: {a.targetAudience}
                </div>
              )}

              {a.tags && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {JSON.parse(a.tags).map((tag: string) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
