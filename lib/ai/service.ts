import { db } from "../db";
import {
  buildStructuredSummaryInput,
  generateProjectSummary,
  type AiSummaryResult,
} from "./index";

export type StoredProjectSummary = {
  projectId: string;
  slug: string;
  summary: AiSummaryResult;
};

function decimalToString(value: { toString(): string } | null) {
  return value ? value.toString() : null;
}

export async function summarizeAndStoreAllProjects(): Promise<StoredProjectSummary[]> {
  const projects = await db.project.findMany({
    include: {
      score: true,
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

  const stored: StoredProjectSummary[] = [];

  for (const project of projects) {
    const input = buildStructuredSummaryInput({
      project: {
        name: project.name,
        ticker: project.ticker,
        description: project.description,
        status: project.status,
        website: project.website,
        twitter: project.twitter,
        whitepaper: project.whitepaper,
        fdv: decimalToString(project.fdv),
        salePrice: decimalToString(project.sale_price),
        totalSupply: decimalToString(project.total_supply),
        vestingSummary: project.vesting_summary,
      },
      score: project.score
        ? {
            totalScore: project.score.total_score,
            tokenomicsScore: project.score.tokenomics_score,
            credibilityScore: project.score.credibility_score,
            narrativeScore: project.score.narrative_score,
            liquidityScore: project.score.liquidity_score,
            transparencyScore: project.score.transparency_score,
            hypeScore: project.score.hype_score,
          }
        : null,
      flags: project.red_flags.map((flag) => ({
        type: flag.type,
        severity: flag.severity,
        description: flag.description,
      })),
    });

    const summary = await generateProjectSummary(input);

    await db.projectSummary.upsert({
      where: { project_id: project.id },
      create: {
        project_id: project.id,
        ai_summary: summary.aiSummary,
        ai_risk_explanation: summary.aiRiskExplanation,
      },
      update: {
        ai_summary: summary.aiSummary,
        ai_risk_explanation: summary.aiRiskExplanation,
      },
    });

    stored.push({
      projectId: project.id,
      slug: project.slug,
      summary,
    });
  }

  return stored;
}
