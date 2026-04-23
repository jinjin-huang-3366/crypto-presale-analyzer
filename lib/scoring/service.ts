import { db } from "../db";
import { scoreProject, type ProjectScoreResult } from "./index";

export type StoredProjectScore = {
  projectId: string;
  slug: string;
  result: ProjectScoreResult;
};

export async function scoreAndStoreAllProjects(): Promise<StoredProjectScore[]> {
  const projects = await db.project.findMany({
    include: {
      red_flags: {
        select: {
          type: true,
          severity: true,
          description: true,
        },
      },
    },
    orderBy: {
      created_at: "asc",
    },
  });

  const stored: StoredProjectScore[] = [];

  for (const project of projects) {
    const result = scoreProject({
      fdv: project.fdv,
      vestingSummary: project.vesting_summary,
      description: project.description,
      website: project.website,
      whitepaper: project.whitepaper,
      twitter: project.twitter,
      status: project.status,
      redFlags: project.red_flags,
    });

    await db.projectScore.upsert({
      where: { project_id: project.id },
      create: {
        project_id: project.id,
        total_score: result.totalScore,
        tokenomics_score: result.categoryScores.tokenomics,
        credibility_score: result.categoryScores.credibility,
        narrative_score: result.categoryScores.narrative,
        liquidity_score: result.categoryScores.liquidity,
        transparency_score: result.categoryScores.transparency,
        hype_score: result.categoryScores.hype,
      },
      update: {
        total_score: result.totalScore,
        tokenomics_score: result.categoryScores.tokenomics,
        credibility_score: result.categoryScores.credibility,
        narrative_score: result.categoryScores.narrative,
        liquidity_score: result.categoryScores.liquidity,
        transparency_score: result.categoryScores.transparency,
        hype_score: result.categoryScores.hype,
      },
    });

    stored.push({
      projectId: project.id,
      slug: project.slug,
      result,
    });
  }

  return stored;
}
