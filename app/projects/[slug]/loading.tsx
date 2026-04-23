export default function ProjectDetailLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 py-12">
      <div className="surface-card rounded-lg p-6">
        <div className="h-4 w-16 animate-pulse rounded bg-slate-700/60" />
        <div className="mt-3 h-9 w-2/5 animate-pulse rounded bg-slate-600/60" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-700/60" />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="surface-card-soft rounded-lg p-4"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-slate-700/60" />
            <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-slate-600/60" />
          </div>
        ))}
      </section>

      <div className="surface-card h-48 animate-pulse rounded-lg" />
      <div className="surface-card h-48 animate-pulse rounded-lg" />
    </main>
  );
}
