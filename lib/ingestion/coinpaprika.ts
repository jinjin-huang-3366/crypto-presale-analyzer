import type { IngestionProjectRecord } from "./types";

const COINPAPRIKA_BASE_URL = "https://api.coinpaprika.com/v1";
const DEFAULT_REAL_LIMIT = 25;
const MAX_REAL_LIMIT = 100;
const DEFAULT_DETAILS_LIMIT = 8;
const REQUEST_TIMEOUT_MS = 15000;

type CoinPaprikaTicker = {
  id?: string;
  name?: string;
  symbol?: string;
  rank?: number | null;
  total_supply?: number | null;
  max_supply?: number | null;
  first_data_at?: string | null;
  quotes?: {
    USD?: {
      price?: number | null;
      market_cap?: number | null;
    } | null;
  } | null;
};

type CoinPaprikaCoinDetails = {
  id?: string;
  description?: string | null;
  is_active?: boolean;
  started_at?: string | null;
  links?: {
    website?: string[] | null;
  } | null;
  links_extended?:
    | Array<{
        type?: string;
        url?: string;
      }>
    | null;
  whitepaper?: {
    link?: string | null;
  } | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parsePositiveInt(value: string | undefined, fallback: number, max: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clamp(parsed, 1, max);
}

function parseNonNegativeInt(value: string | undefined, fallback: number, max: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clamp(parsed, 0, max);
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isHttpUrl(value: string | undefined | null): value is string {
  if (!value) {
    return false;
  }
  return value.startsWith("http://") || value.startsWith("https://");
}

function firstNonEmpty(values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    if (!value) {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return null;
}

function normalizeSlug(value: string, fallbackSymbol: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized.length > 0) {
    return normalized;
  }

  return `coin-${fallbackSymbol.toLowerCase()}`;
}

function normalizeNumberLike(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return String(value);
}

function estimateFdv(ticker: CoinPaprikaTicker): string | null {
  const price = ticker.quotes?.USD?.price;
  const maxSupply = ticker.max_supply;

  if (
    typeof price === "number" &&
    Number.isFinite(price) &&
    price > 0 &&
    typeof maxSupply === "number" &&
    Number.isFinite(maxSupply) &&
    maxSupply > 0
  ) {
    return normalizeNumberLike(price * maxSupply);
  }

  return normalizeNumberLike(ticker.quotes?.USD?.market_cap);
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `CoinPaprika request failed (${response.status}) for ${url}. ${body.slice(0, 220)}`,
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTopTickers(limit: number): Promise<CoinPaprikaTicker[]> {
  const url = `${COINPAPRIKA_BASE_URL}/tickers?quotes=USD`;
  const payload = await fetchJson<CoinPaprikaTicker[]>(url);

  const filtered = payload.filter(
    (ticker) =>
      typeof ticker.id === "string" &&
      typeof ticker.name === "string" &&
      typeof ticker.symbol === "string",
  );

  filtered.sort((left, right) => {
    const leftRank = typeof left.rank === "number" ? left.rank : Number.MAX_SAFE_INTEGER;
    const rightRank = typeof right.rank === "number" ? right.rank : Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank;
  });

  return filtered.slice(0, limit);
}

async function fetchCoinDetails(coinId: string): Promise<CoinPaprikaCoinDetails | null> {
  try {
    return await fetchJson<CoinPaprikaCoinDetails>(
      `${COINPAPRIKA_BASE_URL}/coins/${coinId}`,
    );
  } catch (error) {
    console.warn(`CoinPaprika details fetch failed for ${coinId}`, error);
    return null;
  }
}

function getWebsite(coinId: string, details: CoinPaprikaCoinDetails | null): string {
  const website = firstNonEmpty(details?.links?.website ?? []);
  if (website && isHttpUrl(website)) {
    return website;
  }

  return `https://coinpaprika.com/coin/${coinId}/`;
}

function getTwitter(details: CoinPaprikaCoinDetails | null): string | null {
  if (!details?.links_extended) {
    return null;
  }

  const twitterEntry = details.links_extended.find(
    (entry) =>
      entry.type === "twitter" && typeof entry.url === "string" && isHttpUrl(entry.url),
  );

  return twitterEntry?.url ?? null;
}

function getWhitepaper(details: CoinPaprikaCoinDetails | null): string | null {
  const link = details?.whitepaper?.link ?? null;
  return isHttpUrl(link) ? link : null;
}

export async function getCoinPaprikaIngestionProjects(): Promise<IngestionProjectRecord[]> {
  const limit = parsePositiveInt(
    process.env.INGESTION_REAL_LIMIT,
    DEFAULT_REAL_LIMIT,
    MAX_REAL_LIMIT,
  );
  const detailsLimit = parseNonNegativeInt(
    process.env.COINPAPRIKA_DETAILS_LIMIT,
    DEFAULT_DETAILS_LIMIT,
    limit,
  );
  const topTickers = await fetchTopTickers(limit);

  if (topTickers.length === 0) {
    return [];
  }

  const detailTargets = topTickers.slice(0, detailsLimit).map((ticker) => ticker.id as string);
  const detailResults = await Promise.all(
    detailTargets.map(async (coinId) => [coinId, await fetchCoinDetails(coinId)] as const),
  );
  const detailsById = new Map(detailResults);

  return topTickers.map((ticker) => {
    const coinId = ticker.id as string;
    const name = (ticker.name as string).trim();
    const symbol = (ticker.symbol as string).trim().toUpperCase();
    const details = detailsById.get(coinId) ?? null;
    const description =
      firstNonEmpty([details?.description]) ??
      `Market data ingested from CoinPaprika for ${name}.`;

    const detailStartedAt = parseDate(details?.started_at ?? null);
    const tickerStartedAt = parseDate(ticker.first_data_at ?? null);

    return {
      name,
      slug: normalizeSlug(coinId, symbol),
      ticker: symbol,
      description,
      status: details?.is_active === false ? "ended" : "live",
      website: getWebsite(coinId, details),
      twitter: getTwitter(details),
      whitepaper: getWhitepaper(details),
      start_date: detailStartedAt ?? tickerStartedAt,
      end_date: null,
      fdv: estimateFdv(ticker),
      sale_price: normalizeNumberLike(ticker.quotes?.USD?.price),
      total_supply: normalizeNumberLike(ticker.total_supply ?? ticker.max_supply),
      vesting_summary: null,
    };
  });
}
