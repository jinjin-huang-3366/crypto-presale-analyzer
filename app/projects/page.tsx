import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects",
  description: "Browse scored crypto presale projects and review status, total score, and detail pages.",
};

function statusClass(status: string) {
  if (status === "live") {
    return "border border-emerald-500/35 bg-emerald-500/15 text-emerald-200";
  }
  if (status === "ended") {
    return "border border-slate-500/45 bg-slate-500/20 text-slate-200";
  }
  return "border border-amber-500/35 bg-amber-500/15 text-amber-200";
}

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      ticker: true,
      status: true,
      score: {
        select: {
          total_score: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const sorted = [...projects].sort(
    (a, b) => (b.score?.total_score ?? 0) - (a.score?.total_score ?? 0),
  );
  const liveCount = sorted.filter((project) => project.status === "live").length;
  const avgScore = sorted.length
    ? Math.round(
        sorted.reduce((sum, project) => sum + (project.score?.total_score ?? 0), 0) /
          sorted.length,
      )
    : null;
  const topScore = sorted.length ? sorted[0].score?.total_score ?? null : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-blue-50">Projects</h1>
        <p className="text-muted text-sm">{sorted.length} projects loaded</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="metric-tile rounded-lg px-4 py-3">
          <p className="text-faint text-[11px] uppercase tracking-wide">Live Presales</p>
          <p className="mt-1 text-xl font-semibold text-blue-100">{liveCount}</p>
        </article>
        <article className="metric-tile rounded-lg px-4 py-3">
          <p className="text-faint text-[11px] uppercase tracking-wide">Average Score</p>
          <p className="mt-1 text-xl font-semibold text-blue-100">{avgScore ?? "N/A"}</p>
        </article>
        <article className="metric-tile rounded-lg px-4 py-3">
          <p className="text-faint text-[11px] uppercase tracking-wide">Top Score</p>
          <p className="mt-1 text-xl font-semibold text-blue-100">{topScore ?? "N/A"}</p>
        </article>
      </section>

      {sorted.length > 0 && (
        <section className="data-grid overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="data-head text-left">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">#</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Project</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Status</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Score</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Detail</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((project, index) => (
                  <tr key={project.id} className="data-row">
                    <td className="px-4 py-3 text-sm font-semibold text-blue-200">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md border border-blue-400/25 bg-blue-500/10 text-center text-xs font-semibold leading-8 text-blue-200">
                          {project.ticker.slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/projects/${project.slug}`}
                            className="truncate text-sm font-semibold text-blue-50 hover:text-cyan-200"
                          >
                            {project.name}
                          </Link>
                          <p className="text-faint truncate text-xs">{project.ticker}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClass(project.status)}`}
                      >
                        {project.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-base font-semibold text-blue-100">
                      {project.score?.total_score ?? "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/projects/${project.slug}`}
                        className="btn-ghost inline-flex rounded-md px-3 py-1.5 text-xs"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {sorted.length === 0 && (
        <p className="surface-card-soft rounded-lg border-dashed p-6 text-sm text-slate-300">
          No projects found. Run `npm run db:seed` to populate mock data.
        </p>
      )}
    </main>
  );
}
