"use client";

import Link from "next/link";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070f1f] text-blue-50">
        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="rounded-full border border-red-500/35 bg-red-500/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-red-200">
            Fatal Error
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Application error</h1>
          <p className="text-muted text-sm">
            A critical error occurred while rendering the application shell.
          </p>
          <p className="text-faint text-xs">{error.message}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="btn-primary rounded-md px-4 py-2 text-sm font-medium"
            >
              Reload
            </button>
            <Link
              href="/"
              className="btn-ghost rounded-md px-4 py-2 text-sm"
            >
              Home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
