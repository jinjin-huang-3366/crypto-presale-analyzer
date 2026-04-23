export default function ProjectsLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 py-12">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-600/60" />
        <div className="h-4 w-32 animate-pulse rounded bg-slate-700/60" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="surface-card rounded-lg p-4"
          >
            <div className="h-5 w-2/3 animate-pulse rounded bg-slate-600/60" />
            <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-slate-700/60" />
            <div className="mt-5 h-10 w-full animate-pulse rounded bg-slate-700/60" />
          </div>
        ))}
      </div>
    </main>
  );
}
