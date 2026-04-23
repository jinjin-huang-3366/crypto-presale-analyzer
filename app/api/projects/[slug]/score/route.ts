import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;

  try {
    const project = await db.project.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        score: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (!project.score) {
      return NextResponse.json(
        { error: "Score not found for project." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      project_id: project.id,
      slug: project.slug,
      score: {
        total_score: project.score.total_score,
        tokenomics_score: project.score.tokenomics_score,
        credibility_score: project.score.credibility_score,
        narrative_score: project.score.narrative_score,
        liquidity_score: project.score.liquidity_score,
        transparency_score: project.score.transparency_score,
        hype_score: project.score.hype_score,
      },
    });
  } catch (error) {
    console.error(`GET /api/projects/${slug}/score failed`, error);
    return NextResponse.json(
      { error: "Failed to load project score." },
      { status: 500 },
    );
  }
}
