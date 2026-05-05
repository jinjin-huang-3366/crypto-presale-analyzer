import type { IngestionProjectRecord } from "./types";

type MockSourceStatus = "upcoming" | "active" | "closed";

type MockSourceProject = {
  projectName: string;
  slug: string;
  symbol: string;
  blurb: string;
  status: MockSourceStatus;
  links: {
    website: string;
    twitter?: string;
    whitepaper?: string;
  };
  saleWindow?: {
    start?: string;
    end?: string;
  };
  tokenomics?: {
    fdvUsd?: string;
    salePriceUsd?: string;
    totalSupply?: string;
    vesting?: string;
  };
};

const mockSourceProjects: MockSourceProject[] = [
  {
    projectName: "Nebula L2",
    slug: "nebula-l2",
    symbol: "NEB",
    blurb: "Modular L2 for low-fee game transactions and high-throughput quests.",
    status: "upcoming",
    links: {
      website: "https://nebula.example",
      twitter: "https://x.com/nebula",
      whitepaper: "https://nebula.example/whitepaper",
    },
    saleWindow: {
      start: "2026-05-06T09:00:00.000Z",
      end: "2026-05-13T21:00:00.000Z",
    },
    tokenomics: {
      fdvUsd: "125000000",
      salePriceUsd: "0.082",
      totalSupply: "1500000000",
      vesting: "10% TGE, 12-month linear vesting.",
    },
  },
  {
    projectName: "DeltaPay",
    slug: "delta-pay",
    symbol: "DLP",
    blurb: "Merchant settlement rails with programmable stablecoin payouts.",
    status: "active",
    links: {
      website: "https://deltapay.example",
      twitter: "https://x.com/deltapay",
      whitepaper: "https://deltapay.example/whitepaper",
    },
    saleWindow: {
      start: "2026-04-12T09:00:00.000Z",
      end: "2026-04-29T22:00:00.000Z",
    },
    tokenomics: {
      fdvUsd: "101000000",
      salePriceUsd: "0.068",
      totalSupply: "1500000000",
      vesting: "20% TGE, 8-month vesting.",
    },
  },
  {
    projectName: "Harbor RWA",
    slug: "harbor-rwa",
    symbol: "HBR",
    blurb: "Tokenized treasury and private credit vault infrastructure.",
    status: "closed",
    links: {
      website: "https://harborrwa.example",
      twitter: "https://x.com/harborrwa",
      whitepaper: "https://harborrwa.example/paper",
    },
    saleWindow: {
      start: "2026-02-11T10:00:00.000Z",
      end: "2026-02-28T22:00:00.000Z",
    },
    tokenomics: {
      fdvUsd: "47000000",
      salePriceUsd: "0.032",
      totalSupply: "1460000000",
      vesting: "10% TGE, 12-month linear vesting.",
    },
  },
  {
    projectName: "Vector Bridge",
    slug: "vector-bridge",
    symbol: "VBR",
    blurb: "Cross-chain settlement bridge with intent-based routing and MEV shielding.",
    status: "upcoming",
    links: {
      website: "https://vectorbridge.example",
      twitter: "https://x.com/vectorbridge",
      whitepaper: "https://vectorbridge.example/docs/whitepaper",
    },
    saleWindow: {
      start: "2026-06-18T10:00:00.000Z",
      end: "2026-06-26T19:00:00.000Z",
    },
    tokenomics: {
      fdvUsd: "92000000",
      salePriceUsd: "0.071",
      totalSupply: "1300000000",
      vesting: "12% TGE, 10-month linear vesting.",
    },
  },
];

function normalizeStatus(status: MockSourceStatus): IngestionProjectRecord["status"] {
  if (status === "active") {
    return "live";
  }
  if (status === "closed") {
    return "ended";
  }
  return "upcoming";
}

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeNumberLike(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? normalized : null;
}

function normalizeOptionalText(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeProject(project: MockSourceProject): IngestionProjectRecord {
  return {
    name: project.projectName.trim(),
    slug: project.slug.trim().toLowerCase(),
    ticker: project.symbol.trim().toUpperCase(),
    description: project.blurb.trim(),
    status: normalizeStatus(project.status),
    website: project.links.website.trim(),
    twitter: normalizeOptionalText(project.links.twitter),
    whitepaper: normalizeOptionalText(project.links.whitepaper),
    start_date: parseDate(project.saleWindow?.start),
    end_date: parseDate(project.saleWindow?.end),
    fdv: normalizeNumberLike(project.tokenomics?.fdvUsd),
    sale_price: normalizeNumberLike(project.tokenomics?.salePriceUsd),
    total_supply: normalizeNumberLike(project.tokenomics?.totalSupply),
    vesting_summary: normalizeOptionalText(project.tokenomics?.vesting),
  };
}

export function getMockIngestionProjects(): IngestionProjectRecord[] {
  return mockSourceProjects.map((project) => normalizeProject(project));
}
