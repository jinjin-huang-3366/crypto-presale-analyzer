export default function AdminLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 py-12">
      <div className="space-y-2">
        <div className="h-8 w-28 animate-pulse rounded bg-slate-600/60" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-700/60" />
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="surface-card h-32 animate-pulse rounded-lg" />
        <div className="surface-card h-32 animate-pulse rounded-lg" />
      </section>

      <div className="surface-card h-44 animate-pulse rounded-lg" />
    </main>
  );
}
