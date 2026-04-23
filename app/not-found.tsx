import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="rounded-full border border-slate-500/40 bg-slate-500/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-200">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-blue-50">
        Page not found
      </h1>
      <p className="text-muted text-sm">
        The page you requested does not exist or may have been moved.
      </p>
      <Link
        href="/projects"
        className="btn-primary mt-1 rounded-md px-4 py-2 text-sm font-medium"
      >
        Browse Projects
      </Link>
    </main>
  );
}
