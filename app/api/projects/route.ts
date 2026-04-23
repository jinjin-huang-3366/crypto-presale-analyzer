import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function decimalToString(value: { toString(): string } | null) {
  return value ? value.toString() : null;
}

export async function GET() {
  try {
    const projects = await db.project.findMany({
      include: {
        score: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const data = projects.map((project) => ({
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
    }));

    return NextResponse.json({
      projects: data,
      count: data.length,
    });
  } catch (error) {
    console.error("GET /api/projects failed", error);
    return NextResponse.json(
      { error: "Failed to load projects." },
      { status: 500 },
    );
  }
}
