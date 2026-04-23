import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

type RedFlagResponseItem = {
  id: string;
  type: string;
  severity: string;
  description: string;
};

function decimalToString(value: { toString(): string } | null) {
  return value ? value.toString() : null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;

  try {
    const project = await db.project.findUnique({
      where: { slug },
      include: {
        score: true,
        red_flags: true,
        summary: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        ticker: project.ticker,
        description: project.description,
        status: project.status,
        website: project.website,
        twitter: project.twitter,
        whitepaper: project.whitepaper,
        start_date: project.start_date?.toISOString() ?? null,
        end_date: project.end_date?.toISOString() ?? null,
        fdv: decimalToString(project.fdv),
        sale_price: decimalToString(project.sale_price),
        total_supply: decimalToString(project.total_supply),
        vesting_summary: project.vesting_summary,
        created_at: project.created_at.toISOString(),
        updated_at: project.updated_at.toISOString(),
      },
      score: project.score
        ? {
            total_score: project.score.total_score,
            tokenomics_score: project.score.tokenomics_score,
            credibility_score: project.score.credibility_score,
            narrative_score: project.score.narrative_score,
            liquidity_score: project.score.liquidity_score,
            transparency_score: project.score.transparency_score,
            hype_score: project.score.hype_score,
          }
        : null,
      redflags: project.red_flags.map((flag: RedFlagResponseItem) => ({
        id: flag.id,
        type: flag.type,
        severity: flag.severity,
        description: flag.description,
      })),
      summary: project.summary
        ? {
            ai_summary: project.summary.ai_summary,
            ai_risk_explanation: project.summary.ai_risk_explanation,
          }
        : null,
    });
  } catch (error) {
    console.error(`GET /api/projects/${slug} failed`, error);
    return NextResponse.json(
      { error: "Failed to load project." },
      { status: 500 },
    );
  }
}
