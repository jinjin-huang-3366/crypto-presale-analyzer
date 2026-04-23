export default function CompareLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 py-12">
      <div className="space-y-2">
        <div className="h-8 w-52 animate-pulse rounded bg-slate-600/60" />
        <div className="h-4 w-80 animate-pulse rounded bg-slate-700/60" />
      </div>

      <div className="surface-card rounded-lg p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="metric-tile h-12 animate-pulse rounded-md"
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="surface-card h-72 animate-pulse rounded-lg"
          />
        ))}
      </div>
    </main>
  );
}
