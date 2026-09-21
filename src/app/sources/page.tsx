import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = await db.source.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });

  // Group by category
  const grouped = sources.reduce(
    (acc, s) => {
      (acc[s.category] ??= []).push(s);
      return acc;
    },
    {} as Record<string, typeof sources>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Sources</h1>
        <p className="text-gray-400">Monitored business forums, blogs, and communities</p>
      </div>

      {sources.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">📡</div>
          <p>No sources registered yet.</p>
          <p className="text-sm mt-2">Start the bot to auto-register sources.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, categorySources]) => (
          <section key={category}>
            <h2 className="text-lg font-semibold mb-3 capitalize text-gray-300">
              {category.replace(/-/g, " ")}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categorySources.map((source) => (
                <div
                  key={source.id}
                  className="p-4 rounded-lg bg-gray-800/50 border border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{source.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        source.enabled
                          ? "bg-green-900/50 text-green-400"
                          : "bg-red-900/50 text-red-400"
                      }`}
                    >
                      {source.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Type: {source.type} · {source._count.items} items
                  </div>
                  {source.lastScanned && (
                    <div className="mt-1 text-xs text-gray-600">
                      Last scan: {source.lastScanned.toLocaleString()}
                    </div>
                  )}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-xs text-blue-400 hover:underline block truncate"
                  >
                    {source.url}
                  </a>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
