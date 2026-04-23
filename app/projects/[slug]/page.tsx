import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const project = await db.project.findUnique({
    where: { slug },
    select: {
      name: true,
      ticker: true,
      description: true,
    },
  });

  if (!project) {
    return {
      title: "Project Not Found",
      description: "The requested project could not be located.",
    };
  }

  const description = project.description.slice(0, 160);
  const title = `${project.name} (${project.ticker})`;

  return {
    title,
    description,
    alternates: {
      canonical: `/projects/${slug}`,
    },
    openGraph: {
      type: "article",
      url: `/projects/${slug}`,
      title,
      description,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

function formatDate(value: Date | null) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

function formatDecimal(value: Prisma.Decimal | null) {
  if (!value) {
    return "N/A";
  }

  const numeric = Number(value.toString());
  if (Number.isNaN(numeric)) {
    return value.toString();
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(numeric);
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

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const project = await db.project.findUnique({
    where: { slug },
    include: {
      score: true,
      red_flags: true,
      summary: true,
    },
  });

  if (!project) {
    notFound();
  }

  const scoreBreakdown = [
    { label: "Tokenomics", value: project.score?.tokenomics_score ?? 0, max: 25 },
    { label: "Credibility", value: project.score?.credibility_score ?? 0, max: 20 },
    { label: "Narrative", value: project.score?.narrative_score ?? 0, max: 15 },
    { label: "Liquidity", value: project.score?.liquidity_score ?? 0, max: 20 },
    { label: "Transparency", value: project.score?.transparency_score ?? 0, max: 10 },
    { label: "Hype", value: project.score?.hype_score ?? 0, max: 10 },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-faint text-sm">{project.ticker}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-blue-50">{project.name}</h1>
          <p className="text-muted mt-2 max-w-3xl text-sm">{project.description}</p>
        </div>
        <div className="surface-card rounded-lg px-5 py-3 text-right">
          <p className="text-faint text-xs uppercase tracking-wide">Total Score</p>
          <p className="text-4xl font-bold text-blue-100">{project.score?.total_score ?? "N/A"}</p>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="surface-card-soft rounded-lg p-4">
          <p className="text-faint text-xs uppercase tracking-wide">Status</p>
          <p className="mt-1 text-sm font-medium capitalize text-blue-100">{project.status}</p>
        </div>
        <div className="surface-card-soft rounded-lg p-4">
          <p className="text-faint text-xs uppercase tracking-wide">Sale Window</p>
          <p className="mt-1 text-sm font-medium text-blue-100">
            {formatDate(project.start_date)} - {formatDate(project.end_date)}
          </p>
        </div>
        <div className="surface-card-soft rounded-lg p-4">
          <p className="text-faint text-xs uppercase tracking-wide">FDV</p>
          <p className="mt-1 text-sm font-medium text-blue-100">{formatDecimal(project.fdv)}</p>
        </div>
        <div className="surface-card-soft rounded-lg p-4">
          <p className="text-faint text-xs uppercase tracking-wide">Sale Price</p>
          <p className="mt-1 text-sm font-medium text-blue-100">{formatDecimal(project.sale_price)}</p>
        </div>
        <div className="surface-card-soft rounded-lg p-4">
          <p className="text-faint text-xs uppercase tracking-wide">Total Supply</p>
          <p className="mt-1 text-sm font-medium text-blue-100">{formatDecimal(project.total_supply)}</p>
        </div>
        <div className="surface-card-soft rounded-lg p-4">
          <p className="text-faint text-xs uppercase tracking-wide">Vesting</p>
          <p className="mt-1 text-sm font-medium text-blue-100">
            {project.vesting_summary ?? "N/A"}
          </p>
        </div>
      </section>

      <section className="surface-card rounded-lg p-5">
        <h2 className="text-xl font-semibold text-blue-50">Score Breakdown</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {scoreBreakdown.map((item) => (
            <div
              key={item.label}
              className="metric-tile flex items-center justify-between rounded-md px-3 py-2"
            >
              <span className="text-sm text-blue-100">{item.label}</span>
              <span className="text-sm font-semibold text-blue-200">
                {item.value}/{item.max}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-lg p-5">
        <h2 className="text-xl font-semibold text-blue-50">Red Flags</h2>
        <div className="mt-4 space-y-3">
          {project.red_flags.length === 0 && (
            <p className="text-muted text-sm">No red flags detected.</p>
          )}
          {project.red_flags.map((flag) => (
            <div key={flag.id} className="surface-card-soft rounded-md p-3">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${severityClass(flag.severity)}`}
                >
                  {flag.severity}
                </span>
                <p className="text-sm font-semibold text-blue-100">{flag.type}</p>
              </div>
              <p className="text-muted text-sm">{flag.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-lg p-5">
        <h2 className="text-xl font-semibold text-blue-50">Resources</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <a
            href={project.website}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost rounded-md px-3 py-2"
          >
            Website
          </a>
          {project.twitter && (
            <a
              href={project.twitter}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost rounded-md px-3 py-2"
            >
              Twitter
            </a>
          )}
          {project.whitepaper && (
            <a
              href={project.whitepaper}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost rounded-md px-3 py-2"
            >
              Whitepaper
            </a>
          )}
          <Link href="/projects" className="btn-ghost rounded-md px-3 py-2">
            Back to Projects
          </Link>
        </div>
      </section>

      {project.summary && (
        <section className="surface-card rounded-lg p-5">
          <h2 className="text-xl font-semibold text-blue-50">AI Summary</h2>
          <p className="mt-3 text-sm text-blue-100">{project.summary.ai_summary}</p>
          <p className="text-muted mt-2 text-sm">
            {project.summary.ai_risk_explanation}
          </p>
        </section>
      )}
    </main>
  );
}
