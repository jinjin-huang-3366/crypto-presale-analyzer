const CATEGORY_MAX = {
  tokenomics: 25,
  credibility: 20,
  narrative: 15,
  liquidity: 20,
  transparency: 10,
  hype: 10,
} as const;

type NumericLike = number | string | { toString(): string } | null | undefined;

export type ScoringRedFlag = {
  type: string;
  severity: string;
  description: string;
};

export type ScoreProjectInput = {
  fdv?: NumericLike;
  vestingSummary?: string | null;
  description?: string | null;
  website?: string | null;
  whitepaper?: string | null;
  twitter?: string | null;
  status?: string | null;
  redFlags?: ScoringRedFlag[];
};

export type ProjectCategoryScores = {
  tokenomics: number;
  credibility: number;
  narrative: number;
  liquidity: number;
  transparency: number;
  hype: number;
};

export type ProjectScoreResult = {
  totalScore: number;
  categoryScores: ProjectCategoryScores;
  reasons: string[];
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: NumericLike): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeToCategory(max: number, signal: number) {
  return Math.round(clamp(signal) * max);
}

function evaluateFdvSanity(fdv: number | null) {
  if (fdv === null) {
    return {
      signal: 0.55,
      reason: "FDV missing; applied neutral FDV sanity score.",
    };
  }

  if (fdv <= 70_000_000) {
    return {
      signal: 1,
      reason: `FDV ${fdv.toLocaleString("en-US")} is in a conservative range.`,
    };
  }

  if (fdv <= 120_000_000) {
    return {
      signal: 0.85,
      reason: `FDV ${fdv.toLocaleString("en-US")} is reasonable for an early-stage sale.`,
    };
  }

  if (fdv <= 200_000_000) {
    return {
      signal: 0.65,
      reason: `FDV ${fdv.toLocaleString("en-US")} is elevated and introduces valuation risk.`,
    };
  }

  if (fdv <= 300_000_000) {
    return {
      signal: 0.45,
      reason: `FDV ${fdv.toLocaleString("en-US")} is high versus typical presale ranges.`,
    };
  }

  return {
    signal: 0.25,
    reason: `FDV ${fdv.toLocaleString("en-US")} is very high and heavily penalized.`,
  };
}

function extractInsiderAllocationPercent(input: ScoreProjectInput) {
  const texts: string[] = [];
  if (input.vestingSummary) {
    texts.push(input.vestingSummary);
  }
  for (const flag of input.redFlags ?? []) {
    texts.push(flag.type, flag.description);
  }

  const keywordPattern = /(insider|team|advisor|allocation|reserved|control)/i;
  const percentPattern = /(\d+(?:\.\d+)?)\s*%/gi;
  const candidates: number[] = [];

  for (const text of texts) {
    if (!keywordPattern.test(text)) {
      continue;
    }

    const matches = text.matchAll(percentPattern);
    for (const match of matches) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) {
        candidates.push(value);
      }
    }
  }

  if (candidates.length > 0) {
    return Math.max(...candidates);
  }

  const hasHighInsiderFlag = (input.redFlags ?? []).some((flag) =>
    flag.type.toLowerCase().includes("high_insider"),
  );

  if (hasHighInsiderFlag) {
    return 30;
  }

  return null;
}

function evaluateAllocationSignal(allocationPercent: number | null) {
  if (allocationPercent === null) {
    return {
      signal: 0.6,
      reason: "Insider allocation not disclosed; applied neutral allocation score.",
    };
  }

  if (allocationPercent <= 15) {
    return {
      signal: 1,
      reason: `Insider allocation ${allocationPercent}% is healthy.`,
    };
  }

  if (allocationPercent <= 20) {
    return {
      signal: 0.85,
      reason: `Insider allocation ${allocationPercent}% is acceptable.`,
    };
  }

  if (allocationPercent <= 25) {
    return {
      signal: 0.7,
      reason: `Insider allocation ${allocationPercent}% is somewhat high.`,
    };
  }

  if (allocationPercent <= 30) {
    return {
      signal: 0.45,
      reason: `Insider allocation ${allocationPercent}% is high and penalized.`,
    };
  }

  return {
    signal: 0.2,
    reason: `Insider allocation ${allocationPercent}% is very high and heavily penalized.`,
  };
}

function evaluateVestingSignal(vestingSummary: string | null | undefined) {
  if (!vestingSummary || vestingSummary.trim().length === 0) {
    return {
      signal: 0.2,
      reason: "No vesting summary provided.",
    };
  }

  const normalized = vestingSummary.toLowerCase();
  if (
    normalized.includes("no detailed vesting") ||
    normalized.includes("not provided") ||
    normalized.includes("unknown")
  ) {
    return {
      signal: 0.2,
      reason: "Vesting details are explicitly missing.",
    };
  }

  const monthMatches = normalized.matchAll(/(\d+)\s*(?:-|\s)?month/gi);
  let maxMonths = 0;
  for (const match of monthMatches) {
    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      maxMonths = Math.max(maxMonths, value);
    }
  }

  const tgeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*%\s*tge/i);
  const tgePercent = tgeMatch ? Number(tgeMatch[1]) : null;

  let signal = 0.45;
  if (maxMonths >= 12) {
    signal = 1;
  } else if (maxMonths >= 9) {
    signal = 0.85;
  } else if (maxMonths >= 6) {
    signal = 0.65;
  } else if (maxMonths >= 3) {
    signal = 0.5;
  } else if (normalized.includes("vesting") || normalized.includes("cliff")) {
    signal = 0.55;
  }

  if (tgePercent !== null && tgePercent > 20) {
    signal = clamp(signal - 0.15);
  }

  if (maxMonths > 0) {
    return {
      signal,
      reason: `Vesting detected (${maxMonths} months${tgePercent !== null ? `, ${tgePercent}% TGE` : ""}).`,
    };
  }

  return {
    signal,
    reason: "Vesting text present but with limited schedule detail.",
  };
}

export function scoreProject(input: ScoreProjectInput): ProjectScoreResult {
  const fdv = toNumber(input.fdv);
  const fdvEvaluation = evaluateFdvSanity(fdv);
  const allocationPercent = extractInsiderAllocationPercent(input);
  const allocationEvaluation = evaluateAllocationSignal(allocationPercent);
  const vestingEvaluation = evaluateVestingSignal(input.vestingSummary);

  const hasDescription = Boolean(input.description && input.description.trim().length >= 24);
  const hasWebsite = Boolean(input.website);
  const hasWhitepaper = Boolean(input.whitepaper);
  const hasTwitter = Boolean(input.twitter);
  const status = (input.status ?? "").toLowerCase();

  const tokenomicsSignal =
    0.5 * fdvEvaluation.signal +
    0.35 * allocationEvaluation.signal +
    0.15 * vestingEvaluation.signal;

  const credibilitySignal =
    0.45 * allocationEvaluation.signal +
    0.35 * vestingEvaluation.signal +
    0.2 * (hasWhitepaper ? 1 : 0.35);

  const narrativeSignal = clamp(
    (hasDescription ? 0.55 : 0.3) + (hasWebsite ? 0.2 : 0.05) + (hasWhitepaper ? 0.25 : 0.1),
  );

  const liquiditySignal = 0.6 * vestingEvaluation.signal + 0.4 * fdvEvaluation.signal;

  const transparencySignal =
    0.7 * vestingEvaluation.signal +
    0.2 * (hasWhitepaper ? 1 : 0.4) +
    0.1 * (hasWebsite ? 1 : 0.5);

  const statusSignal =
    status === "live" ? 0.8 : status === "upcoming" ? 0.7 : status === "ended" ? 0.5 : 0.6;
  const hypeSignal = clamp(statusSignal + (hasTwitter ? 0.2 : 0.05));

  const categoryScores: ProjectCategoryScores = {
    tokenomics: normalizeToCategory(CATEGORY_MAX.tokenomics, tokenomicsSignal),
    credibility: normalizeToCategory(CATEGORY_MAX.credibility, credibilitySignal),
    narrative: normalizeToCategory(CATEGORY_MAX.narrative, narrativeSignal),
    liquidity: normalizeToCategory(CATEGORY_MAX.liquidity, liquiditySignal),
    transparency: normalizeToCategory(CATEGORY_MAX.transparency, transparencySignal),
    hype: normalizeToCategory(CATEGORY_MAX.hype, hypeSignal),
  };

  const totalScore = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);

  const reasons: string[] = [
    fdvEvaluation.reason,
    allocationEvaluation.reason,
    vestingEvaluation.reason,
  ];

  if (!hasWhitepaper) {
    reasons.push("Whitepaper not found; credibility/transparency capped.");
  }

  return {
    totalScore,
    categoryScores,
    reasons,
  };
}
