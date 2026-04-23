type NumericLike = number | string | { toString(): string } | null | undefined;

type SupportedSeverity = "low" | "medium" | "high";

export type AiProjectInput = {
  name: string;
  ticker?: string | null;
  description?: string | null;
  status?: string | null;
  website?: string | null;
  twitter?: string | null;
  whitepaper?: string | null;
  fdv?: NumericLike;
  salePrice?: NumericLike;
  totalSupply?: NumericLike;
  vestingSummary?: string | null;
};

export type AiScoreInput = {
  totalScore: number;
  tokenomicsScore: number;
  credibilityScore: number;
  narrativeScore: number;
  liquidityScore: number;
  transparencyScore: number;
  hypeScore: number;
};

export type AiFlagInput = {
  type: string;
  severity: string;
  description: string;
};

export type AiSummaryInput = {
  project: AiProjectInput;
  score: AiScoreInput | null;
  flags: AiFlagInput[];
};

export type AiSummaryResult = {
  aiSummary: string;
  aiRiskExplanation: string;
  provider: "openai" | "rules";
};

const CATEGORY_META = [
  { label: "Tokenomics", key: "tokenomicsScore", max: 25 },
  { label: "Credibility", key: "credibilityScore", max: 20 },
  { label: "Narrative", key: "narrativeScore", max: 15 },
  { label: "Liquidity", key: "liquidityScore", max: 20 },
  { label: "Transparency", key: "transparencyScore", max: 10 },
  { label: "Hype", key: "hypeScore", max: 10 },
] as const satisfies Array<{
  label: string;
  key: keyof AiScoreInput;
  max: number;
}>;

const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";

function normalizeSeverity(value: string): SupportedSeverity {
  const normalized = value.toLowerCase();
  if (normalized === "high" || normalized === "medium") {
    return normalized;
  }
  return "low";
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

function topAndBottomCategories(score: AiScoreInput) {
  const ranked = CATEGORY_META.map((item) => ({
    label: item.label,
    max: item.max,
    value: score[item.key],
    normalized: score[item.key] / item.max,
  })).sort((a, b) => b.normalized - a.normalized);

  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];

  return { strongest, weakest };
}

function computeRiskLevel(score: AiScoreInput | null, flags: AiFlagInput[]) {
  const scoreRiskPoints =
    !score ? 2 : score.totalScore >= 80 ? 0 : score.totalScore >= 65 ? 1 : score.totalScore >= 50 ? 2 : 3;

  const severityPoints = flags.reduce((sum, flag) => {
    const severity = normalizeSeverity(flag.severity);
    if (severity === "high") {
      return sum + 2;
    }
    if (severity === "medium") {
      return sum + 1;
    }
    return sum;
  }, 0);

  const totalPoints = scoreRiskPoints + severityPoints;

  if (totalPoints >= 5) {
    return "high";
  }
  if (totalPoints >= 2) {
    return "medium";
  }
  return "low";
}

function readableProjectName(input: AiProjectInput) {
  if (input.ticker) {
    return `${input.name} (${input.ticker})`;
  }
  return input.name;
}

function buildRuleSummary(input: AiSummaryInput): Omit<AiSummaryResult, "provider"> {
  const projectName = readableProjectName(input.project);
  const scoreText = input.score ? `${input.score.totalScore}/100` : "N/A";

  const summaryParts: string[] = [
    `${projectName} is currently marked as ${input.project.status ?? "unknown"} with a total score of ${scoreText}.`,
  ];

  if (input.score) {
    const { strongest, weakest } = topAndBottomCategories(input.score);
    summaryParts.push(
      `Strongest category: ${strongest.label} (${strongest.value}/${strongest.max}).`,
    );
    summaryParts.push(
      `Weakest category: ${weakest.label} (${weakest.value}/${weakest.max}).`,
    );
  }

  const highCount = input.flags.filter((flag) => normalizeSeverity(flag.severity) === "high").length;
  const mediumCount = input.flags.filter(
    (flag) => normalizeSeverity(flag.severity) === "medium",
  ).length;

  if (input.flags.length === 0) {
    summaryParts.push("No red flags were detected by the current rule set.");
  } else {
    summaryParts.push(
      `${input.flags.length} red flag(s) detected (${highCount} high, ${mediumCount} medium).`,
    );
  }

  const riskLevel = computeRiskLevel(input.score, input.flags);

  let riskExplanation = `Overall risk is ${riskLevel} based on score profile and detected red flags.`;
  const topFlag = [...input.flags].sort((a, b) => {
    const scoreA =
      normalizeSeverity(a.severity) === "high" ? 2 : normalizeSeverity(a.severity) === "medium" ? 1 : 0;
    const scoreB =
      normalizeSeverity(b.severity) === "high" ? 2 : normalizeSeverity(b.severity) === "medium" ? 1 : 0;
    return scoreB - scoreA;
  })[0];

  if (topFlag) {
    riskExplanation = `${riskExplanation} Key concern: ${topFlag.description}`;
  }

  riskExplanation =
    `${riskExplanation} Generated only from structured project, score, and red-flag data. ` +
    "Research tool only, not financial advice.";

  return {
    aiSummary: summaryParts.join(" "),
    aiRiskExplanation: riskExplanation,
  };
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const maybeOutputText = (payload as { output_text?: unknown }).output_text;
  if (typeof maybeOutputText === "string" && maybeOutputText.trim().length > 0) {
    return maybeOutputText.trim();
  }

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return "";
  }

  const collected: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const chunk of content) {
      if (!chunk || typeof chunk !== "object") {
        continue;
      }

      const text = (chunk as { text?: unknown }).text;
      if (typeof text === "string" && text.trim().length > 0) {
        collected.push(text.trim());
      }
    }
  }

  return collected.join("\n").trim();
}

function parseAiLines(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const summaryLine = lines.find((line) => line.toUpperCase().startsWith("SUMMARY:"));
  const riskLine = lines.find((line) => line.toUpperCase().startsWith("RISK:"));

  if (!summaryLine || !riskLine) {
    return null;
  }

  const aiSummary = summaryLine.replace(/^SUMMARY:\s*/i, "").trim();
  const aiRiskExplanation = riskLine.replace(/^RISK:\s*/i, "").trim();

  if (!aiSummary || !aiRiskExplanation) {
    return null;
  }

  return { aiSummary, aiRiskExplanation };
}

async function generateWithOpenAi(input: AiSummaryInput): Promise<Omit<AiSummaryResult, "provider"> | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;

  const instruction = [
    "You are generating a crypto presale project summary from structured input only.",
    "Never invent data and never provide investment advice.",
    "Return exactly two lines:",
    "SUMMARY: <single concise paragraph>",
    "RISK: <single concise paragraph>",
  ].join("\n");

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_output_tokens: 220,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: instruction }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(input),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    console.error(`OpenAI summary generation failed (${response.status}): ${message}`);
    return null;
  }

  const payload = (await response.json()) as unknown;
  const text = extractOutputText(payload);

  if (!text) {
    return null;
  }

  return parseAiLines(text);
}

export function buildProjectSummary(input: AiSummaryInput): AiSummaryResult {
  return {
    ...buildRuleSummary(input),
    provider: "rules",
  };
}

export async function generateProjectSummary(input: AiSummaryInput): Promise<AiSummaryResult> {
  try {
    const aiResult = await generateWithOpenAi(input);
    if (aiResult) {
      return {
        ...aiResult,
        provider: "openai",
      };
    }
  } catch (error) {
    console.error("AI summary generation failed. Falling back to rule-based summary.", error);
  }

  return buildProjectSummary(input);
}

export function buildStructuredSummaryInput(raw: AiSummaryInput): AiSummaryInput {
  return {
    ...raw,
    project: {
      ...raw.project,
      fdv: toNumber(raw.project.fdv),
      salePrice: toNumber(raw.project.salePrice),
      totalSupply: toNumber(raw.project.totalSupply),
    },
    flags: raw.flags.map((flag) => ({
      ...flag,
      severity: normalizeSeverity(flag.severity),
    })),
  };
}
