import type { Metadata } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare",
  description: "Compare 2-4 crypto presale projects side-by-side by score breakdown and red flags.",
};

type PageProps = {
  searchParams: Promise<{
    project?: string | string[];
  }>;
};

const scoreFields = [
  { label: "Total", key: "total_score", max: 100 },
  { label: "Tokenomics", key: "tokenomics_score", max: 25 },
  { label: "Credibility", key: "credibility_score", max: 20 },
  { label: "Narrative", key: "narrative_score", max: 15 },
  { label: "Liquidity", key: "liquidity_score", max: 20 },
  { label: "Transparency", key: "transparency_score", max: 10 },
  { label: "Hype", key: "hype_score", max: 10 },
] as const;

function toSelection(value: string | string[] | undefined) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(list.map((slug) => slug.trim()).filter(Boolean))];
}

function statusClass(status: string) {
  if (status === "live") {
    return "border border-emerald-500/35 bg-emerald-500/15 text-emerald-200";
  }
  if (status === "ended") {
    return "border border-slate-500/45 bg-slate-500/20 text-slate-200";
  }
  return "border border-amber-500/35 bg-amber-500/15 text-amber-200";
}

function severityClass(severity: string) {
  if (severity === "high") {
    return "border border-red-500/35 bg-red-500/15 text-red-200";
  }
  if (severity === "medium") {
    return "border border-amber-500/35 bg-amber-500/15 text-amber-200";
  }
  return "border border-slate-500/45 bg-slate-500/20 text-slate-200";
}

function severityRank(severity: string) {
  if (severity === "high") {
    return 0;
  }
  if (severity === "medium") {
    return 1;
  }
  return 2;
}

function getTickerBadge(ticker: string) {
  const normalized = ticker.trim().toUpperCase();
  return normalized.slice(0, 3) || "TOK";
}

function getFallbackFaviconUrl(website: string) {
  const trimmed = website.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const hostname = new URL(trimmed).hostname;
    if (!hostname) {
      return null;
    }
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}`;
  } catch {
    return null;
  }
}

function resolveProjectLogo(logoUrl: string | null, website: string) {
  if (logoUrl && logoUrl.trim().length > 0) {
    return logoUrl.trim();
  }
  return getFallbackFaviconUrl(website);
}

export default async function ComparePage({ searchParams }: PageProps) {
  const params = await searchParams;

  const allProjects = await db.project.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      ticker: true,
      status: true,
      website: true,
      logo_url: true,
      score: {
        select: {
          total_score: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const slugs = new Set(allProjects.map((project) => project.slug));
  const selectedSlugs = toSelection(params.project).filter((slug) =>
    slugs.has(slug),
  );
  const canCompare = selectedSlugs.length >= 2 && selectedSlugs.length <= 4;

  const comparedRaw = canCompare
    ? await db.project.findMany({
        where: {
          slug: {
            in: selectedSlugs,
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          ticker: true,
          status: true,
          website: true,
          logo_url: true,
          score: {
            select: {
              total_score: true,
              tokenomics_score: true,
              credibility_score: true,
              narrative_score: true,
              liquidity_score: true,
              transparency_score: true,
              hype_score: true,
            },
          },
          red_flags: {
            select: {
              id: true,
              type: true,
              severity: true,
              description: true,
            },
          },
        },
      })
    : [];

  const comparedBySlug = new Map(comparedRaw.map((project) => [project.slug, project]));
  const comparedProjects = selectedSlugs
    .map((slug) => comparedBySlug.get(slug))
    .filter((project): project is (typeof comparedRaw)[number] => Boolean(project));
  const topTotalScore = comparedProjects.reduce(
    (best, project) => Math.max(best, project.score?.total_score ?? 0),
    0,
  );
  const lowestRedFlagCount = comparedProjects.length
    ? Math.min(...comparedProjects.map((project) => project.red_flags.length))
    : 0;
  const bestScoreByField = scoreFields.reduce((acc, field) => {
    acc[field.key] = comparedProjects.reduce(
      (best, project) => Math.max(best, project.score?.[field.key] ?? 0),
      0,
    );
    return acc;
  }, {} as Record<(typeof scoreFields)[number]["key"], number>);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-blue-50">Compare Projects</h1>
        <p className="text-muted text-sm">
          Select 2-4 projects and compare scores plus red flags side-by-side.
        </p>
      </div>

      <section className="surface-card rounded-lg p-5">
        <form
          key={selectedSlugs.length > 0 ? selectedSlugs.join("|") : "none"}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allProjects.map((project) => (
              <label
                key={project.id}
                className="metric-tile flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {(() => {
                    const logoUrl = resolveProjectLogo(project.logo_url, project.website);

                    if (logoUrl) {
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoUrl}
                          alt={`${project.name} logo`}
                          className="h-7 w-7 rounded-md border border-blue-400/25 bg-blue-500/10 object-cover p-0.5"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      );
                    }

                    return (
                      <div className="h-7 w-7 rounded-md border border-blue-400/25 bg-blue-500/10 text-center text-[10px] font-semibold leading-7 text-blue-200">
                        {getTickerBadge(project.ticker)}
                      </div>
                    );
                  })()}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-blue-100">{project.name}</p>
                    <p className="text-faint text-xs">{project.ticker}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="project"
                  value={project.slug}
                  defaultChecked={selectedSlugs.includes(project.slug)}
                  className="h-4 w-4 accent-cyan-400"
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="btn-primary rounded-md px-4 py-2 text-sm font-medium"
            >
              Compare
            </button>
            <a href="/compare" className="btn-ghost rounded-md px-4 py-2 text-sm">
              Clear Selection
            </a>
            <p className="text-faint text-xs">
              {selectedSlugs.length} selected (minimum 2, maximum 4)
            </p>
          </div>
        </form>
      </section>

      {selectedSlugs.length === 0 && (
        <p className="surface-card-soft rounded-lg border-dashed p-6 text-sm text-slate-300">
          Choose projects above to start a comparison.
        </p>
      )}

      {selectedSlugs.length === 1 && (
        <p className="rounded-lg border border-amber-500/35 bg-amber-500/15 p-4 text-sm text-amber-200">
          Select one more project to view side-by-side comparison.
        </p>
      )}

      {selectedSlugs.length > 4 && (
        <p className="rounded-lg border border-red-500/35 bg-red-500/15 p-4 text-sm text-red-200">
          You selected {selectedSlugs.length} projects. Please choose no more than 4.
        </p>
      )}

      {canCompare && (
        <section className="overflow-x-auto">
          <div
            className="grid min-w-[780px] gap-4"
            style={{ gridTemplateColumns: `repeat(${comparedProjects.length}, minmax(0, 1fr))` }}
          >
            {comparedProjects.map((project) => (
              <article
                key={project.id}
                className={`surface-card rounded-lg p-4 ${
                  comparedProjects.length > 1 &&
                  (project.score?.total_score ?? 0) === topTotalScore
                    ? "ring-1 ring-emerald-400/50"
                    : ""
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    {(() => {
                      const logoUrl = resolveProjectLogo(project.logo_url, project.website);

                      if (logoUrl) {
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoUrl}
                            alt={`${project.name} logo`}
                            className="h-9 w-9 shrink-0 rounded-md border border-blue-400/25 bg-blue-500/10 object-cover p-0.5"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                        );
                      }

                      return (
                        <div className="h-9 w-9 shrink-0 rounded-md border border-blue-400/25 bg-blue-500/10 text-center text-xs font-semibold leading-9 text-blue-200">
                          {getTickerBadge(project.ticker)}
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold leading-6 text-blue-50">{project.name}</h2>
                      <p className="text-faint text-sm">{project.ticker}</p>
                      {comparedProjects.length > 1 &&
                        (project.score?.total_score ?? 0) === topTotalScore && (
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                            Best Overall
                          </p>
                        )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(project.status)}`}
                  >
                    {project.status}
                  </span>
                </div>

                <section className="metric-tile mb-4 rounded-md p-3">
                  <h3 className="text-faint text-xs font-semibold uppercase tracking-wide">
                    Scores
                  </h3>
                  <div className="mt-2 space-y-2">
                    {scoreFields.map((field) => {
                      const value = project.score?.[field.key] ?? 0;
                      const isBestInField =
                        comparedProjects.length > 1 &&
                        value === bestScoreByField[field.key] &&
                        bestScoreByField[field.key] > 0;
                      return (
                        <div
                          key={field.key}
                          className={`flex items-center justify-between gap-2 rounded-md text-sm ${
                            isBestInField ? "bg-emerald-500/10 px-2 py-1" : ""
                          }`}
                        >
                          <span className="text-blue-100">{field.label}</span>
                          <div className="flex items-center gap-2">
                            {isBestInField && (
                              <span className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                                Best
                              </span>
                            )}
                            <span className="font-semibold text-blue-200">
                              {value}/{field.max}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-faint text-xs font-semibold uppercase tracking-wide">
                    Red Flags
                  </h3>
                  <p
                    className={`text-xs ${
                      comparedProjects.length > 1 &&
                      project.red_flags.length === lowestRedFlagCount
                        ? "font-semibold text-emerald-300"
                        : "text-faint"
                    }`}
                  >
                    {project.red_flags.length} flag(s)
                    {comparedProjects.length > 1 &&
                      project.red_flags.length === lowestRedFlagCount &&
                      " - Lowest in selection"}
                  </p>
                  {project.red_flags.length === 0 && (
                    <p className="text-muted text-sm">No red flags detected.</p>
                  )}
                  {[...project.red_flags]
                    .sort((a, b) => {
                      const severity = severityRank(a.severity) - severityRank(b.severity);
                      if (severity !== 0) {
                        return severity;
                      }
                      return a.type.localeCompare(b.type);
                    })
                    .map((flag) => (
                      <div key={flag.id} className="surface-card-soft rounded-md p-2.5">
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${severityClass(flag.severity)}`}
                          >
                            {flag.severity}
                          </span>
                          <p className="text-sm font-medium text-blue-100">{flag.type}</p>
                        </div>
                        <p className="text-muted text-xs">{flag.description}</p>
                      </div>
                    ))}
                </section>
              </article>
            ))}
          </div>
        </section>
      )}

    </main>
  );
}
