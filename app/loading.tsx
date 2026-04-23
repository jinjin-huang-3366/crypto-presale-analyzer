export default function RootLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-300/30 border-t-cyan-300" />
      <p className="text-muted mt-4 text-sm">Loading application data...</p>
    </main>
  );
}
