export type RedFlagSeverity = "low" | "medium" | "high";

export type RedFlagItem = {
  type: string;
  severity: RedFlagSeverity;
  description: string;
};

export type DetectRedFlagsInput = {
  name?: string | null;
  description?: string | null;
  vestingSummary?: string | null;
};

export type RedFlagResult = {
  flags: RedFlagItem[];
};

function extractInsiderAllocationPercent(text: string) {
  const keywordPattern = /(insider|team|advisor|allocation|reserved|control)/i;
  if (!keywordPattern.test(text)) {
    return null;
  }

  const percentPattern = /(\d+(?:\.\d+)?)\s*%/gi;
  const candidates: number[] = [];
  for (const match of text.matchAll(percentPattern)) {
    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      candidates.push(value);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  return Math.max(...candidates);
}

function extractTgePercent(text: string) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*%\s*tge/i);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

function hasMissingVesting(summary: string | null | undefined) {
  if (!summary || summary.trim().length === 0) {
    return true;
  }

  const normalized = summary.toLowerCase();
  return (
    normalized.includes("no detailed vesting") ||
    normalized.includes("not provided") ||
    normalized.includes("unknown")
  );
}

function hasUnclearUtility(description: string | null | undefined) {
  if (!description || description.trim().length < 40) {
    return true;
  }

  const normalized = description.toLowerCase();
  const utilityKeywords = [
    "payments",
    "settlement",
    "storage",
    "oracle",
    "identity",
    "compute",
    "yield",
    "vault",
    "marketplace",
    "dex",
    "rollup",
    "tokenized",
    "social",
    "game",
    "gaming",
    "credit",
  ];

  const hasUtilityKeyword = utilityKeywords.some((keyword) =>
    normalized.includes(keyword),
  );

  if (!hasUtilityKeyword) {
    return true;
  }

  const vaguePhrases = [
    "general purpose",
    "broad utility",
    "community first",
    "future features",
  ];
  return vaguePhrases.some((phrase) => normalized.includes(phrase));
}

export function detectRedFlags(input: DetectRedFlagsInput): RedFlagResult {
  const flags: RedFlagItem[] = [];

  if (hasMissingVesting(input.vestingSummary)) {
    flags.push({
      type: "missing_vesting",
      severity: "high",
      description: "Project does not provide a clear vesting schedule.",
    });
  }

  const insiderAllocation = extractInsiderAllocationPercent(input.vestingSummary ?? "");
  const tgePercent = extractTgePercent(input.vestingSummary ?? "");
  const effectiveInsiderAllocation =
    insiderAllocation ?? (tgePercent !== null && tgePercent >= 20 ? tgePercent : null);

  if (effectiveInsiderAllocation !== null && effectiveInsiderAllocation >= 22) {
    flags.push({
      type: "high_insider_allocation",
      severity: effectiveInsiderAllocation >= 30 ? "high" : "medium",
      description:
        insiderAllocation !== null
          ? `Insider allocation appears elevated at ${effectiveInsiderAllocation}%.`
          : `Large ${effectiveInsiderAllocation}% TGE unlock suggests concentrated early allocation risk.`,
    });
  }

  if (hasUnclearUtility(input.description)) {
    flags.push({
      type: "unclear_utility",
      severity: "medium",
      description:
        "Utility proposition is not specific enough from available project description.",
    });
  }

  return { flags };
}
