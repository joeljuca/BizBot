import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [totalItems, totalAnalyses, totalSources, totalSubscribers, recentItems] =
    await Promise.all([
      db.item.count(),
      db.analysis.count(),
      db.source.count(),
      db.subscriber.count({ where: { active: true } }),
      db.item.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { source: true, analysis: true },
      }),
    ]);

  const topOpportunities = await db.analysis.findMany({
    orderBy: { score: "desc" },
    take: 5,
    include: { item: { include: { source: true } } },
  });

  const typeDistribution = await db.analysis.groupBy({
    by: ["opportunityType"],
    _count: { id: true },
    _avg: { score: true },
    orderBy: { _count: { id: "desc" } },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">
          Real-time view of your business opportunity scanner
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Items Scanned"
          value={totalItems}
          emoji="📥"
          color="text-blue-400"
        />
        <StatCard
          label="Opportunities Found"
          value={totalAnalyses}
          emoji="💡"
          color="text-yellow-400"
        />
        <StatCard
          label="Active Sources"
          value={totalSources}
          emoji="📡"
          color="text-green-400"
        />
        <StatCard
          label="Subscribers"
          value={totalSubscribers}
          emoji="👥"
          color="text-purple-400"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Top Opportunities */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            🏆 Top Opportunities
          </h2>
          <div className="space-y-3">
            {topOpportunities.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No opportunities yet. Run a scan to get started.
              </p>
            ) : (
              topOpportunities.map((a) => (
                <a
                  key={a.id}
                  href={a.item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-lg bg-gray-800/50 border border-gray-700 card-hover"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">
                      {a.item.title}
                    </h3>
                    <span className="text-xs font-mono bg-gray-700 px-2 py-0.5 rounded shrink-0">
                      {a.score.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {a.keyInsight}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">
                      {a.item.source.name}
                    </span>
                    <span className="tag-pill">{a.opportunityType.replace("_", " ")}</span>
                  </div>
                </a>
              ))
            )}
          </div>
        </section>

        {/* Recent Items */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            🕐 Latest Scans
          </h2>
          <div className="space-y-3">
            {recentItems.length === 0 ? (
              <p className="text-gray-500 text-sm">No items scanned yet.</p>
            ) : (
              recentItems.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-lg bg-gray-800/50 border border-gray-700 card-hover"
                >
                  <h3 className="font-medium text-sm leading-tight line-clamp-2">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{item.source.name}</span>
                    {item.score && <span>↑ {item.score}</span>}
                    {item.commentCount && <span>💬 {item.commentCount}</span>}
                  </div>
                </a>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Type Distribution */}
      {typeDistribution.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            📊 Opportunity Types
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {typeDistribution.map((t) => (
              <div
                key={t.opportunityType}
                className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"
              >
                <div className="text-sm font-medium capitalize">
                  {t.opportunityType.replace(/_/g, " ")}
                </div>
                <div className="text-2xl font-bold text-blue-400">
                  {t._count.id}
                </div>
                <div className="text-xs text-gray-500">
                  Avg score: {t._avg.score?.toFixed(1) || "N/A"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  emoji,
  color,
}: {
  label: string;
  value: number;
  emoji: string;
  color: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
