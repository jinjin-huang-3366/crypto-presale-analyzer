"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Unhandled route error", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="rounded-full border border-red-500/35 bg-red-500/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-red-200">
        Unexpected Error
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-blue-50">
        Something went wrong
      </h1>
      <p className="text-muted text-sm">
        The page could not be rendered right now. You can retry or return to the projects list.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="btn-primary rounded-md px-4 py-2 text-sm font-medium"
        >
          Try Again
        </button>
        <Link
          href="/projects"
          className="btn-ghost rounded-md px-4 py-2 text-sm"
        >
          Go to Projects
        </Link>
      </div>
    </main>
  );
}
