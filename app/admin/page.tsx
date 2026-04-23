import type { Metadata } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin dashboard for ingestion status and project inventory metrics.",
  robots: {
    index: false,
    follow: false,
  },
};

type LatestSyncRun = {
  source: string;
  inserted_count: number;
  updated_count: number;
  total_processed: number;
  synced_at: Date;
};

function formatDateTime(value: Date | null) {
  if (!value) {
    return "No sync runs yet";
  }

  const formatted = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);

  return `${formatted}`;
}

export default async function AdminPage() {
  const [projectCount, latestSyncRows] = await Promise.all([
    db.project.count(),
    db.$queryRaw<LatestSyncRun[]>`
      SELECT "source", "inserted_count", "updated_count", "total_processed", "synced_at"
      FROM "IngestionSyncRun"
      ORDER BY "synced_at" DESC
      LIMIT 1
    `,
  ]);
  const lastSyncRun = latestSyncRows[0] ?? null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-blue-50">Admin</h1>
        <p className="text-muted text-sm">
          Basic ingestion metrics and project inventory.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="surface-card rounded-lg p-5">
          <p className="text-faint text-xs uppercase tracking-wide">Project Count</p>
          <p className="mt-2 text-3xl font-bold text-blue-100">{projectCount}</p>
          <p className="text-faint mt-1 text-xs">Projects currently stored in database</p>
        </article>

        <article className="surface-card rounded-lg p-5">
          <p className="text-faint text-xs uppercase tracking-wide">Last Sync Time</p>
          <p className="mt-2 text-lg font-semibold text-blue-100">{formatDateTime(lastSyncRun?.synced_at ?? null)}</p>
          <p className="text-faint mt-1 text-xs">
            {lastSyncRun ? `Source: ${lastSyncRun.source}` : "Run POST /api/internal/sync to create a sync record"}
          </p>
        </article>
      </section>

      {lastSyncRun && (
        <section className="surface-card rounded-lg p-5">
          <h2 className="text-lg font-semibold text-blue-50">Latest Sync Summary</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="metric-tile rounded-md p-3">
              <p className="text-faint text-xs uppercase tracking-wide">Inserted</p>
              <p className="mt-1 text-xl font-semibold text-blue-100">{lastSyncRun.inserted_count}</p>
            </div>
            <div className="metric-tile rounded-md p-3">
              <p className="text-faint text-xs uppercase tracking-wide">Updated</p>
              <p className="mt-1 text-xl font-semibold text-blue-100">{lastSyncRun.updated_count}</p>
            </div>
            <div className="metric-tile rounded-md p-3">
              <p className="text-faint text-xs uppercase tracking-wide">Processed</p>
              <p className="mt-1 text-xl font-semibold text-blue-100">{lastSyncRun.total_processed}</p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
