import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

type SeedProject = {
  name: string;
  slug: string;
  ticker: string;
  description: string;
  status: string;
  website: string;
  twitter?: string;
  whitepaper?: string;
  startDate?: string;
  endDate?: string;
  fdv?: string;
  salePrice?: string;
  totalSupply?: string;
  vestingSummary?: string;
  score: {
    totalScore: number;
    tokenomicsScore: number;
    credibilityScore: number;
    narrativeScore: number;
    liquidityScore: number;
    transparencyScore: number;
    hypeScore: number;
  };
  flags: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    description: string;
  }>;
  summary: {
    aiSummary: string;
    aiRiskExplanation: string;
  };
};

const seedProjects: SeedProject[] = [
  {
    name: "Nebula L2",
    slug: "nebula-l2",
    ticker: "NEB",
    description: "Modular L2 focused on low-fee game transactions.",
    status: "upcoming",
    website: "https://nebula.example",
    twitter: "https://x.com/nebula",
    whitepaper: "https://nebula.example/whitepaper",
    startDate: "2026-05-05T09:00:00.000Z",
    endDate: "2026-05-12T21:00:00.000Z",
    fdv: "120000000",
    salePrice: "0.08",
    totalSupply: "1500000000",
    vestingSummary: "10% TGE, 12-month linear vesting.",
    score: {
      totalScore: 74,
      tokenomicsScore: 18,
      credibilityScore: 16,
      narrativeScore: 13,
      liquidityScore: 14,
      transparencyScore: 8,
      hypeScore: 5,
    },
    flags: [
      {
        type: "high_insider_allocation",
        severity: "medium",
        description: "Team and advisors control 24% of token supply.",
      },
    ],
    summary: {
      aiSummary:
        "Nebula L2 has clear use-case alignment and reasonable vesting terms.",
      aiRiskExplanation:
        "Insider allocation is above ideal and may pressure post-listing liquidity.",
    },
  },
  {
    name: "VaultMesh",
    slug: "vaultmesh",
    ticker: "VMH",
    description: "Cross-chain vault automation for stablecoin yield routing.",
    status: "live",
    website: "https://vaultmesh.example",
    twitter: "https://x.com/vaultmesh",
    whitepaper: "https://vaultmesh.example/docs",
    startDate: "2026-04-18T12:00:00.000Z",
    endDate: "2026-04-28T20:00:00.000Z",
    fdv: "55000000",
    salePrice: "0.045",
    totalSupply: "1200000000",
    vestingSummary: "15% TGE, 9-month linear vesting.",
    score: {
      totalScore: 81,
      tokenomicsScore: 21,
      credibilityScore: 17,
      narrativeScore: 12,
      liquidityScore: 16,
      transparencyScore: 9,
      hypeScore: 6,
    },
    flags: [],
    summary: {
      aiSummary:
        "VaultMesh presents balanced tokenomics and strong operational clarity.",
      aiRiskExplanation:
        "Primary risks are competitive market pressure and execution complexity.",
    },
  },
  {
    name: "Orchid Compute",
    slug: "orchid-compute",
    ticker: "ORC",
    description: "Decentralized compute marketplace for AI inference workloads.",
    status: "upcoming",
    website: "https://orchidcompute.example",
    twitter: "https://x.com/orchidcompute",
    whitepaper: "https://orchidcompute.example/paper",
    startDate: "2026-05-20T10:00:00.000Z",
    endDate: "2026-05-27T18:00:00.000Z",
    fdv: "340000000",
    salePrice: "0.17",
    totalSupply: "2000000000",
    vestingSummary: "5% TGE, 18-month vesting with 3-month cliff.",
    score: {
      totalScore: 63,
      tokenomicsScore: 13,
      credibilityScore: 14,
      narrativeScore: 14,
      liquidityScore: 11,
      transparencyScore: 7,
      hypeScore: 4,
    },
    flags: [
      {
        type: "fdv_outlier",
        severity: "high",
        description: "FDV appears high relative to disclosed product traction.",
      },
    ],
    summary: {
      aiSummary:
        "Orchid Compute has a strong narrative but valuation assumptions are aggressive.",
      aiRiskExplanation:
        "High initial FDV raises downside risk if user adoption lags projections.",
    },
  },
  {
    name: "DeltaPay",
    slug: "delta-pay",
    ticker: "DLP",
    description: "Merchant settlement network with programmable stablecoin rails.",
    status: "live",
    website: "https://deltapay.example",
    twitter: "https://x.com/deltapay",
    whitepaper: "https://deltapay.example/whitepaper",
    startDate: "2026-04-10T09:00:00.000Z",
    endDate: "2026-04-25T22:00:00.000Z",
    fdv: "98000000",
    salePrice: "0.065",
    totalSupply: "1500000000",
    vestingSummary: "20% TGE, 6-month vesting.",
    score: {
      totalScore: 69,
      tokenomicsScore: 16,
      credibilityScore: 15,
      narrativeScore: 11,
      liquidityScore: 13,
      transparencyScore: 8,
      hypeScore: 6,
    },
    flags: [
      {
        type: "short_vesting",
        severity: "medium",
        description: "Short vesting period can increase circulating supply quickly.",
      },
    ],
    summary: {
      aiSummary:
        "DeltaPay shows credible business positioning with moderate token unlock risk.",
      aiRiskExplanation:
        "Compressed vesting schedule may increase volatility after exchange listing.",
    },
  },
  {
    name: "EchoDex",
    slug: "echo-dex",
    ticker: "ECHO",
    description: "Perps and spot hybrid DEX with intent-based order routing.",
    status: "upcoming",
    website: "https://echodex.example",
    twitter: "https://x.com/echodex",
    whitepaper: "https://echodex.example/litepaper",
    startDate: "2026-06-02T08:00:00.000Z",
    endDate: "2026-06-10T19:00:00.000Z",
    fdv: "76000000",
    salePrice: "0.052",
    totalSupply: "1450000000",
    vestingSummary: "12% TGE, 10-month linear vesting.",
    score: {
      totalScore: 77,
      tokenomicsScore: 19,
      credibilityScore: 15,
      narrativeScore: 12,
      liquidityScore: 15,
      transparencyScore: 8,
      hypeScore: 8,
    },
    flags: [],
    summary: {
      aiSummary:
        "EchoDex has balanced metrics and above-average community momentum.",
      aiRiskExplanation:
        "Main risks are execution against larger DEX incumbents.",
    },
  },
  {
    name: "Lumen ID",
    slug: "lumen-id",
    ticker: "LID",
    description: "Privacy-preserving reputation and identity layer for DeFi.",
    status: "ended",
    website: "https://lumenid.example",
    twitter: "https://x.com/lumenid",
    whitepaper: "https://lumenid.example/docs/whitepaper",
    startDate: "2026-03-03T10:00:00.000Z",
    endDate: "2026-03-18T22:00:00.000Z",
    fdv: "42000000",
    salePrice: "0.029",
    totalSupply: "1400000000",
    vestingSummary: "8% TGE, 12-month vesting.",
    score: {
      totalScore: 83,
      tokenomicsScore: 22,
      credibilityScore: 17,
      narrativeScore: 13,
      liquidityScore: 15,
      transparencyScore: 9,
      hypeScore: 7,
    },
    flags: [],
    summary: {
      aiSummary:
        "Lumen ID exhibits strong disclosure quality and conservative token emission.",
      aiRiskExplanation:
        "Adoption pace remains the key uncertainty despite good fundamentals.",
    },
  },
  {
    name: "Helio Storage",
    slug: "helio-storage",
    ticker: "HST",
    description: "Decentralized archival storage with proof-of-access guarantees.",
    status: "live",
    website: "https://heliostorage.example",
    twitter: "https://x.com/heliostorage",
    whitepaper: "https://heliostorage.example/whitepaper-v2",
    startDate: "2026-04-01T12:00:00.000Z",
    endDate: "2026-04-22T21:00:00.000Z",
    fdv: "210000000",
    salePrice: "0.14",
    totalSupply: "1500000000",
    vestingSummary: "25% TGE, 6-month vesting.",
    score: {
      totalScore: 58,
      tokenomicsScore: 11,
      credibilityScore: 13,
      narrativeScore: 10,
      liquidityScore: 10,
      transparencyScore: 7,
      hypeScore: 7,
    },
    flags: [
      {
        type: "high_tge_unlock",
        severity: "high",
        description: "High token generation event unlock may impact early prices.",
      },
      {
        type: "fdv_outlier",
        severity: "medium",
        description: "FDV is elevated versus current ecosystem integrations.",
      },
    ],
    summary: {
      aiSummary:
        "Helio Storage has a valid use case but token release profile is aggressive.",
      aiRiskExplanation:
        "Large initial unlock and valuation assumptions increase near-term risk.",
    },
  },
  {
    name: "Quasar Oracle",
    slug: "quasar-oracle",
    ticker: "QSR",
    description: "Specialized oracle network for gaming and prediction markets.",
    status: "upcoming",
    website: "https://quasaroracle.example",
    twitter: "https://x.com/quasaroracle",
    whitepaper: "https://quasaroracle.example/whitepaper",
    startDate: "2026-05-15T10:00:00.000Z",
    endDate: "2026-05-22T19:00:00.000Z",
    fdv: "66000000",
    salePrice: "0.05",
    totalSupply: "1320000000",
    vestingSummary: "10% TGE, 12-month vesting.",
    score: {
      totalScore: 75,
      tokenomicsScore: 18,
      credibilityScore: 16,
      narrativeScore: 12,
      liquidityScore: 14,
      transparencyScore: 8,
      hypeScore: 7,
    },
    flags: [],
    summary: {
      aiSummary:
        "Quasar Oracle shows a coherent niche strategy and acceptable valuation.",
      aiRiskExplanation:
        "Reliance on niche market growth is the primary structural risk.",
    },
  },
  {
    name: "Pulse SocialFi",
    slug: "pulse-socialfi",
    ticker: "PLS",
    description: "Creator monetization protocol with onchain social primitives.",
    status: "upcoming",
    website: "https://pulsesocialfi.example",
    twitter: "https://x.com/pulsesocialfi",
    whitepaper: "https://pulsesocialfi.example/paper",
    startDate: "2026-06-12T09:00:00.000Z",
    endDate: "2026-06-18T21:00:00.000Z",
    fdv: "150000000",
    salePrice: "0.11",
    totalSupply: "1360000000",
    vestingSummary: "No detailed vesting schedule provided.",
    score: {
      totalScore: 49,
      tokenomicsScore: 8,
      credibilityScore: 10,
      narrativeScore: 9,
      liquidityScore: 9,
      transparencyScore: 5,
      hypeScore: 8,
    },
    flags: [
      {
        type: "missing_vesting",
        severity: "high",
        description: "Public docs do not provide a complete vesting schedule.",
      },
      {
        type: "unclear_utility",
        severity: "medium",
        description: "Token utility appears broad without concrete fee sinks.",
      },
    ],
    summary: {
      aiSummary:
        "Pulse SocialFi benefits from narrative momentum but lacks clear token disclosures.",
      aiRiskExplanation:
        "Missing vesting clarity and diffuse utility definitions raise execution risk.",
    },
  },
  {
    name: "Aether Rollup",
    slug: "aether-rollup",
    ticker: "ATH",
    description: "ZK rollup stack tailored for enterprise settlement workflows.",
    status: "live",
    website: "https://aetherrollup.example",
    twitter: "https://x.com/aetherrollup",
    whitepaper: "https://aetherrollup.example/whitepaper",
    startDate: "2026-04-06T07:00:00.000Z",
    endDate: "2026-04-26T18:00:00.000Z",
    fdv: "87000000",
    salePrice: "0.062",
    totalSupply: "1400000000",
    vestingSummary: "12% TGE, 15-month vesting with 2-month cliff.",
    score: {
      totalScore: 79,
      tokenomicsScore: 20,
      credibilityScore: 17,
      narrativeScore: 11,
      liquidityScore: 15,
      transparencyScore: 9,
      hypeScore: 7,
    },
    flags: [],
    summary: {
      aiSummary:
        "Aether Rollup combines credible team signals with relatively disciplined emissions.",
      aiRiskExplanation:
        "Partnership concentration and enterprise sales cycles remain key risks.",
    },
  },
  {
    name: "Circuit AI",
    slug: "circuit-ai",
    ticker: "CIR",
    description: "Onchain model marketplace and agent execution network.",
    status: "upcoming",
    website: "https://circuitai.example",
    twitter: "https://x.com/circuitai",
    whitepaper: "https://circuitai.example/whitepaper",
    startDate: "2026-05-30T09:00:00.000Z",
    endDate: "2026-06-08T21:00:00.000Z",
    fdv: "290000000",
    salePrice: "0.19",
    totalSupply: "1520000000",
    vestingSummary: "18% TGE, 8-month vesting.",
    score: {
      totalScore: 54,
      tokenomicsScore: 10,
      credibilityScore: 12,
      narrativeScore: 13,
      liquidityScore: 8,
      transparencyScore: 6,
      hypeScore: 5,
    },
    flags: [
      {
        type: "high_fdv",
        severity: "high",
        description: "Valuation appears stretched compared with disclosed revenues.",
      },
      {
        type: "short_vesting",
        severity: "medium",
        description: "Vesting duration may be short for long-term protocol growth.",
      },
    ],
    summary: {
      aiSummary:
        "Circuit AI has a strong narrative but token valuation and unlock profile are risk-heavy.",
      aiRiskExplanation:
        "High FDV and short vesting can create unfavorable risk-reward dynamics.",
    },
  },
  {
    name: "Harbor RWA",
    slug: "harbor-rwa",
    ticker: "HBR",
    description: "Tokenized treasury and credit vault platform for stable returns.",
    status: "ended",
    website: "https://harborrwa.example",
    twitter: "https://x.com/harborrwa",
    whitepaper: "https://harborrwa.example/paper",
    startDate: "2026-02-11T10:00:00.000Z",
    endDate: "2026-02-28T22:00:00.000Z",
    fdv: "47000000",
    salePrice: "0.032",
    totalSupply: "1460000000",
    vestingSummary: "10% TGE, 12-month linear vesting.",
    score: {
      totalScore: 85,
      tokenomicsScore: 23,
      credibilityScore: 18,
      narrativeScore: 12,
      liquidityScore: 16,
      transparencyScore: 9,
      hypeScore: 7,
    },
    flags: [],
    summary: {
      aiSummary:
        "Harbor RWA scored high across core categories with balanced risk disclosures.",
      aiRiskExplanation:
        "Main residual risk comes from external market and interest-rate conditions.",
    },
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.redFlag.deleteMany();
    await prisma.projectSummary.deleteMany();
    await prisma.projectScore.deleteMany();
    await prisma.project.deleteMany();

    for (const item of seedProjects) {
      await prisma.project.create({
        data: {
          name: item.name,
          slug: item.slug,
          ticker: item.ticker,
          description: item.description,
          status: item.status,
          website: item.website,
          twitter: item.twitter,
          whitepaper: item.whitepaper,
          start_date: item.startDate ? new Date(item.startDate) : null,
          end_date: item.endDate ? new Date(item.endDate) : null,
          fdv: item.fdv,
          sale_price: item.salePrice,
          total_supply: item.totalSupply,
          vesting_summary: item.vestingSummary,
          score: {
            create: {
              total_score: item.score.totalScore,
              tokenomics_score: item.score.tokenomicsScore,
              credibility_score: item.score.credibilityScore,
              narrative_score: item.score.narrativeScore,
              liquidity_score: item.score.liquidityScore,
              transparency_score: item.score.transparencyScore,
              hype_score: item.score.hypeScore,
            },
          },
          red_flags: {
            create: item.flags.map((flag) => ({
              type: flag.type,
              severity: flag.severity,
              description: flag.description,
            })),
          },
          summary: {
            create: {
              ai_summary: item.summary.aiSummary,
              ai_risk_explanation: item.summary.aiRiskExplanation,
            },
          },
        },
      });
    }

    console.log(`Seed complete: ${seedProjects.length} projects inserted.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
