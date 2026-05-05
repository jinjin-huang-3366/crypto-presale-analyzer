import type { IngestionProjectRecord } from "./types";

const ICODROPS_UPCOMING_FILTER_URL =
  "https://icodrops.com/category/upcoming-ico/filter";
const ICODROPS_PROJECT_BASE_URL = "https://icodrops.com";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const REQUEST_TIMEOUT_MS = 15000;

type IcoDropsFilterResponse = {
  current_page: number;
  total_pages: number;
  rendered_html: string;
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

function cleanText(raw: string | null | undefined): string {
  if (!raw) {
    return "";
  }

  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug.length > 0 ? slug : `project-${Date.now()}`;
}

function parseDate(value: string): Date | null {
  const normalized = cleanText(value);
  if (!normalized) {
    return null;
  }

  const quarterMatch = normalized.match(/^Q([1-4]),\s*(20\d{2})$/i);
  if (quarterMatch) {
    const quarter = Number.parseInt(quarterMatch[1], 10);
    const year = Number.parseInt(quarterMatch[2], 10);
    const month = (quarter - 1) * 3;
    return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  }

  const fromQuarterMatch = normalized.match(/^from\s+Q([1-4]),\s*(20\d{2})$/i);
  if (fromQuarterMatch) {
    const quarter = Number.parseInt(fromQuarterMatch[1], 10);
    const year = Number.parseInt(fromQuarterMatch[2], 10);
    const month = (quarter - 1) * 3;
    return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseUsdCompact(value: string): string | null {
  const normalized = cleanText(value);
  if (!normalized || normalized === "—" || normalized === "-") {
    return null;
  }

  const match = normalized.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)\s*([KMBT])?/i);
  if (!match) {
    return null;
  }

  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  const unit = (match[2] ?? "").toUpperCase();
  const multiplier =
    unit === "K"
      ? 1_000
      : unit === "M"
        ? 1_000_000
        : unit === "B"
          ? 1_000_000_000
          : unit === "T"
            ? 1_000_000_000_000
            : 1;

  return String(numeric * multiplier);
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; crypto-presale-analyzer/1.0)",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `ICO Drops request failed (${response.status}) for ${url}. ${body.slice(0, 200)}`,
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function extractRows(html: string): string[] {
  const rows: string[] = [];
  const rowPattern = /<li\s+class="Tbl-Row[\s\S]*?<\/li>/g;
  let match: RegExpExecArray | null;

  while ((match = rowPattern.exec(html))) {
    rows.push(match[0]);
  }

  return rows;
}

function getCapture(pattern: RegExp, input: string): string | null {
  const match = pattern.exec(input);
  return match?.[1] ?? null;
}

function normalizeRowToProject(rowHtml: string): IngestionProjectRecord | null {
  const projectPath = getCapture(/class="Cll-Project__link"[^>]*href="([^"]+)"/, rowHtml);
  const nameRaw = getCapture(
    /class="Cll-Project__name[^"]*"[^>]*>([\s\S]*?)<\/p>/,
    rowHtml,
  );

  if (!projectPath || !nameRaw) {
    return null;
  }

  const name = cleanText(nameRaw);
  if (!name) {
    return null;
  }

  const tickerRaw = getCapture(
    /class="Cll-Project__ticker"[^>]*>([\s\S]*?)<\/p>/,
    rowHtml,
  );
  const roundRaw = getCapture(
    /Tbl-Row__item--round[\s\S]*?class="Cll-Value[^"]*"[^>]*>([\s\S]*?)<\/p>/,
    rowHtml,
  );
  const preValuationRaw = getCapture(
    /Tbl-Row__item--pre-valuation[\s\S]*?class="Cll-Value[^"]*"[^>]*>([\s\S]*?)<\/p>/,
    rowHtml,
  );
  const dateRaw = getCapture(
    /Tbl-Row__item--date[\s\S]*?<time[^>]*>([\s\S]*?)<\/time>/,
    rowHtml,
  );

  const cleanPath = projectPath.trim();
  const slugFromPath = cleanPath.replace(/^\/+|\/+$/g, "");
  const slug = slugFromPath ? slugify(slugFromPath) : slugify(name);
  const ticker = cleanText(tickerRaw).toUpperCase() || slug.slice(0, 8).toUpperCase();
  const round = cleanText(roundRaw);
  const saleDate = cleanText(dateRaw);
  const startDate = parseDate(saleDate);

  return {
    name,
    slug,
    ticker,
    description: round
      ? `Upcoming token sale (${round}) listed on ICO Drops.`
      : "Upcoming token sale listed on ICO Drops.",
    status: "upcoming",
    website: `${ICODROPS_PROJECT_BASE_URL}/${slug}/`,
    twitter: null,
    whitepaper: null,
    start_date: startDate,
    end_date: null,
    fdv: parseUsdCompact(preValuationRaw ?? ""),
    sale_price: null,
    total_supply: null,
    vesting_summary: round || null,
  };
}

export async function getIcoDropsUpcomingProjects(): Promise<IngestionProjectRecord[]> {
  const limit = parsePositiveInt(process.env.INGESTION_REAL_LIMIT, DEFAULT_LIMIT, MAX_LIMIT);
  const collected: IngestionProjectRecord[] = [];
  const seen = new Set<string>();

  const firstPage = await fetchJson<IcoDropsFilterResponse>(
    `${ICODROPS_UPCOMING_FILTER_URL}?page=1`,
  );

  const totalPages = clamp(firstPage.total_pages || 1, 1, 50);
  const pages = [firstPage];

  for (let page = 2; page <= totalPages && collected.length < limit; page += 1) {
    pages.push(
      await fetchJson<IcoDropsFilterResponse>(
        `${ICODROPS_UPCOMING_FILTER_URL}?page=${page}`,
      ),
    );
  }

  for (const page of pages) {
    const rows = extractRows(page.rendered_html);

    for (const row of rows) {
      if (collected.length >= limit) {
        break;
      }

      const normalized = normalizeRowToProject(row);
      if (!normalized) {
        continue;
      }

      if (seen.has(normalized.slug)) {
        continue;
      }

      seen.add(normalized.slug);
      collected.push(normalized);
    }

    if (collected.length >= limit) {
      break;
    }
  }

  return collected;
}
