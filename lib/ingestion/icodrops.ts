import type { IngestionProjectRecord } from "./types";

const ICODROPS_UPCOMING_FILTER_URL =
  "https://icodrops.com/category/upcoming-ico/filter";
const ICODROPS_ACTIVE_FILTER_URL =
  "https://icodrops.com/category/active-ico/filter";
const ICODROPS_PROJECT_BASE_URL = "https://icodrops.com";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const DEFAULT_DETAILS_CONCURRENCY = 4;
const MAX_DETAILS_CONCURRENCY = 12;
const DEFAULT_ACTIVE_PRESALE_MAX_AGE_DAYS = 365;
const MAX_ACTIVE_PRESALE_MAX_AGE_DAYS = 3650;
const REQUEST_TIMEOUT_MS = 15000;
const SOCIAL_HOSTNAME_SUFFIXES = [
  "twitter.com",
  "x.com",
  "t.me",
  "telegram.me",
  "discord.gg",
  "discord.com",
  "youtube.com",
  "youtu.be",
  "instagram.com",
  "facebook.com",
  "linkedin.com",
  "medium.com",
  "github.com",
  "gitbook.io",
  "linktr.ee",
  "coinmarketcap.com",
  "coingecko.com",
];

type IcoDropsFilterResponse = {
  current_page: number;
  total_pages: number;
  rendered_html: string;
};

type IcoDropsListingType = "upcoming" | "active";

type IcoDropsRoundSnapshot = {
  roundName: string;
  statusLabel: string;
  dateText: string;
  description: string | null;
  headerPrice: string | null;
  infoByTitle: Record<string, string>;
  isCurrent: boolean;
  isEnded: boolean;
};

type IcoDropsProjectPageEnrichment = {
  officialWebsite: string | null;
  twitter: string | null;
  whitepaper: string | null;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  salePrice: string | null;
  fdv: string | null;
  totalSupply: string | null;
  vestingSummary: string | null;
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

function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }
  return value.startsWith("http://") || value.startsWith("https://");
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

  const presumablyMatch = normalized.match(/^presumably on\s+(.+)$/i);
  if (presumablyMatch) {
    return parseDate(presumablyMatch[1]);
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

  const fromDateMatch = normalized.match(/^from\s+(.+)$/i);
  if (fromDateMatch) {
    const fromYearMatch = fromDateMatch[1].match(/^(20\d{2})$/);
    if (fromYearMatch) {
      const year = Number.parseInt(fromYearMatch[1], 10);
      return new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    }

    const fromDate = new Date(fromDateMatch[1]);
    if (!Number.isNaN(fromDate.getTime())) {
      return fromDate;
    }
  }

  const untilDateMatch = normalized.match(/^until\s+(.+)$/i);
  if (untilDateMatch) {
    const untilQuarterMatch = untilDateMatch[1].match(/^Q([1-4]),\s*(20\d{2})$/i);
    if (untilQuarterMatch) {
      const quarter = Number.parseInt(untilQuarterMatch[1], 10);
      const year = Number.parseInt(untilQuarterMatch[2], 10);
      const month = (quarter - 1) * 3;
      return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    }

    const untilYearMatch = untilDateMatch[1].match(/^(20\d{2})$/);
    if (untilYearMatch) {
      const year = Number.parseInt(untilYearMatch[1], 10);
      return new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    }

    const untilDate = new Date(untilDateMatch[1]);
    if (!Number.isNaN(untilDate.getTime())) {
      return untilDate;
    }
  }

  const leftMatch = normalized.match(/(\d+)\s*(d|day|days|h|hr|hour|hours)\s+left/i);
  if (leftMatch) {
    const amount = Number.parseInt(leftMatch[1], 10);
    const unit = leftMatch[2].toLowerCase();
    if (Number.isFinite(amount) && amount >= 0) {
      const now = Date.now();
      const ms =
        unit.startsWith("d")
          ? amount * 24 * 60 * 60 * 1000
          : amount * 60 * 60 * 1000;
      return new Date(now + ms);
    }
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

function parsePositiveNumber(value: string): string | null {
  const normalized = cleanText(value).replace(/,/g, "");
  if (!normalized || normalized === "—" || normalized === "-") {
    return null;
  }

  const match = normalized.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!match) {
    return null;
  }

  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return String(numeric);
}

function parseCompactNumber(value: string): string | null {
  const normalized = cleanText(value).replace(/,/g, "");
  if (!normalized || normalized === "—" || normalized === "-") {
    return null;
  }

  const compactMatch = normalized.match(/([0-9]+(?:\.[0-9]+)?)\s*([KMBT])\b/i);
  if (compactMatch) {
    const numeric = Number.parseFloat(compactMatch[1]);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }

    const unit = compactMatch[2].toUpperCase();
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

  return parsePositiveNumber(normalized);
}

function normalizeAssetUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return `${ICODROPS_PROJECT_BASE_URL}${trimmed}`;
  }

  return `${ICODROPS_PROJECT_BASE_URL}/${trimmed.replace(/^\/+/, "")}`;
}

function isIcoDropsUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "icodrops.com" || hostname.endsWith(".icodrops.com");
  } catch {
    return false;
  }
}

function isLikelySocialUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return SOCIAL_HOSTNAME_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

function normalizeExternalUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (!isHttpUrl(trimmed)) {
    return null;
  }

  return trimmed;
}

function extractOfficialWebsiteFromProjectPage(html: string): string | null {
  const anchors = html.matchAll(
    /<a\b[^>]*href=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi,
  );

  const candidates: string[] = [];

  for (const match of anchors) {
    const hrefRaw = match[2];
    const innerHtml = match[3];
    const href = normalizeExternalUrl(hrefRaw);

    if (!href || isIcoDropsUrl(href)) {
      continue;
    }

    const innerLower = innerHtml.toLowerCase();
    if (innerLower.includes("svg-website")) {
      return href;
    }

    if (isLikelySocialUrl(href)) {
      continue;
    }

    if (innerLower.includes("capsule") || innerLower.includes("project-page-header__links")) {
      candidates.push(href);
    }
  }

  return candidates[0] ?? null;
}

function extractTwitterFromProjectPage(html: string): string | null {
  const anchors = html.matchAll(
    /<a\b[^>]*href=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi,
  );

  for (const match of anchors) {
    const href = normalizeExternalUrl(match[2]);
    if (!href) {
      continue;
    }

    try {
      const hostname = new URL(href).hostname.toLowerCase();
      if (
        hostname === "twitter.com" ||
        hostname.endsWith(".twitter.com") ||
        hostname === "x.com" ||
        hostname.endsWith(".x.com")
      ) {
        return href;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractWhitepaperFromProjectPage(html: string): string | null {
  const anchors = html.matchAll(
    /<a\b[^>]*href=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi,
  );

  for (const match of anchors) {
    const href = normalizeExternalUrl(match[2]);
    if (!href || isIcoDropsUrl(href)) {
      continue;
    }

    const innerText = cleanText(match[3]).toLowerCase();
    const hrefLower = href.toLowerCase();
    if (
      innerText.includes("whitepaper") ||
      hrefLower.includes("whitepaper") ||
      hrefLower.endsWith(".pdf")
    ) {
      return href;
    }
  }

  return null;
}

function extractMetaDescription(html: string): string | null {
  const rawDescription = getCapture(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    html,
  );
  const normalized = cleanText(rawDescription);
  return normalized.length > 0 ? normalized : null;
}

function decodeEscapedProjectCopy(raw: string): string {
  return cleanText(
    raw
      .replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      )
      .replace(/\\n/g, " ")
      .replace(/\\r/g, " ")
      .replace(/\\t/g, " ")
      .replace(/\\"/g, "\"")
      .replace(/\\'/g, "'")
      .replace(/[\u2012\u2013\u2014\u2015\u2212]/g, "-")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, "\""),
  );
}

function extractOverviewDescriptionFromProjectPage(html: string): string | null {
  const rawOverview =
    getCapture(
      /Overview-Section-Description[\s\S]*?x-init="init\('([\s\S]*?)'\)"/i,
      html,
    ) ??
    getCapture(
      /Overview-Section-Description[\s\S]*?x-init='init\("([\s\S]*?)"\)'/i,
      html,
    );

  if (!rawOverview) {
    return null;
  }

  const normalized = decodeEscapedProjectCopy(rawOverview);
  return normalized.length > 0 ? normalized : null;
}

function extractEcosystemNamesFromProjectPage(html: string): string[] {
  const ecosystemBlock = getCapture(
    /Overview-Section-Info-List__name">\s*Ecosystem\s*<\/span>[\s\S]*?<ul class="Overview-Section-Info-List__capsules-list">([\s\S]*?)<\/ul>/i,
    html,
  );

  if (!ecosystemBlock) {
    return [];
  }

  const names: string[] = [];
  const matches = ecosystemBlock.matchAll(/Capsule-Blockchain__name">([\s\S]*?)<\/span>/gi);
  for (const match of matches) {
    const name = cleanText(match[1]);
    if (!name) {
      continue;
    }
    if (!names.includes(name)) {
      names.push(name);
    }
  }

  return names;
}

function composeProjectDescription(
  overviewDescription: string | null,
  ecosystemNames: string[],
  fallbackDescription: string | null,
): string | null {
  const base = overviewDescription ?? fallbackDescription;
  if (!base) {
    return null;
  }

  if (ecosystemNames.length === 0) {
    return base;
  }

  if (base.toLowerCase().includes("ecosystem")) {
    return base;
  }

  return `${base} Ecosystem: ${ecosystemNames.join(", ")}.`;
}

function extractRoundInfoPairs(roundHtml: string): Record<string, string> {
  const pairs: Record<string, string> = {};
  const matches = roundHtml.matchAll(
    /Rounds-Card-Info-Block__title">([\s\S]*?)<\/span>[\s\S]*?Rounds-Card-Info-Block__value">([\s\S]*?)<\/span>/gi,
  );

  for (const match of matches) {
    const rawTitle = cleanText(match[1]);
    const rawValue = cleanText(match[2]);

    if (!rawTitle || !rawValue) {
      continue;
    }

    pairs[rawTitle.toLowerCase()] = rawValue;
  }

  return pairs;
}

function extractRoundSnapshotsFromProjectPage(html: string): IcoDropsRoundSnapshot[] {
  const snapshots: IcoDropsRoundSnapshot[] = [];
  const roundMatches = html.matchAll(
    /<li\s+id="sale\d+"\s+class="Project-Page-Rounds-List__item[\s\S]*?(?=<li\s+id="sale\d+"\s+class="Project-Page-Rounds-List__item|<\/ul>)/gi,
  );

  for (const roundMatch of roundMatches) {
    const roundHtml = roundMatch[0];
    const openTag = getCapture(/^(<li[^>]+>)/i, roundHtml) ?? "";
    const roundName = cleanText(
      getCapture(/Proj-Rounds-Header__title">([\s\S]*?)<\/h2>/i, roundHtml),
    );

    if (!roundName) {
      continue;
    }

    const statusLabel = cleanText(
      getCapture(/Cpsl-Couple__l-part[^>]*>([\s\S]*?)<\/span>/i, roundHtml),
    );
    const dateText = cleanText(
      getCapture(/<time class="Cpsl-Couple__r-part"[^>]*>([\s\S]*?)<\/time>/i, roundHtml),
    );
    const roundDescription = cleanText(
      getCapture(/Project-Page-Custom-Card-Description">([\s\S]*?)<\/p>/i, roundHtml),
    );
    const headerPrice = cleanText(
      getCapture(
        /Cpsl-Items__item Cpsl-Items__item--pale">Price<\/span>\s*<span class="Cpsl-Items__item">([\s\S]*?)<\/span>/i,
        roundHtml,
      ),
    );

    snapshots.push({
      roundName,
      statusLabel,
      dateText,
      description: roundDescription.length > 0 ? roundDescription : null,
      headerPrice: headerPrice.length > 0 ? headerPrice : null,
      infoByTitle: extractRoundInfoPairs(roundHtml),
      isCurrent: /data-current-round/i.test(openTag),
      isEnded: /data-ended-round/i.test(openTag),
    });
  }

  return snapshots;
}

function isSaleRoundName(roundName: string): boolean {
  const normalized = normalizeRoundLabel(roundName);
  if (!normalized) {
    return false;
  }

  const excluded = ["tge", "distribution", "seed round", "series a", "series b", "series c"];
  if (excluded.some((keyword) => normalized.includes(keyword))) {
    return false;
  }

  const included = [
    "presale",
    "private sale",
    "public sale",
    "token sale",
    "wallet sale",
    "community sale",
    "strategic sale",
    "seed sale",
    "ico",
    "ido",
    "ieo",
    "launchpad",
    "sale",
  ];

  return included.some((keyword) => normalized.includes(keyword));
}

function scoreRoundSnapshot(round: IcoDropsRoundSnapshot): number {
  const status = round.statusLabel.toLowerCase();
  const roundName = round.roundName.toLowerCase();
  let score = 0;

  if (round.isCurrent) {
    score += 220;
  }
  if (status.includes("active")) {
    score += 160;
  }
  if (status.includes("upcoming")) {
    score += 140;
  }
  if (status.includes("ended")) {
    score -= 60;
  }
  if (status.includes("launched")) {
    score -= 80;
  }

  if (isSaleRoundName(roundName)) {
    score += 120;
  }
  if (roundName.includes("presale")) {
    score += 40;
  }

  const priceFromInfo = round.infoByTitle.price;
  if ((round.headerPrice && parsePositiveNumber(round.headerPrice)) || parsePositiveNumber(priceFromInfo)) {
    score += 20;
  }

  if (round.infoByTitle["pre-valuation"]) {
    score += 12;
  }

  if (round.dateText.length > 0) {
    score += 10;
  }

  return score;
}

function selectPreferredRoundForSaleData(
  rounds: IcoDropsRoundSnapshot[],
): IcoDropsRoundSnapshot | null {
  if (rounds.length === 0) {
    return null;
  }

  const saleRounds = rounds.filter((round) => isSaleRoundName(round.roundName));
  const candidateRounds = saleRounds.length > 0 ? saleRounds : rounds;

  let preferred: IcoDropsRoundSnapshot | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const round of candidateRounds) {
    const score = scoreRoundSnapshot(round);
    if (score > bestScore) {
      bestScore = score;
      preferred = round;
    }
  }

  return preferred;
}

function deriveRoundDates(round: IcoDropsRoundSnapshot): {
  startDate: Date | null;
  endDate: Date | null;
} {
  const status = round.statusLabel.toLowerCase();
  const dateText = round.dateText;
  if (!dateText) {
    return { startDate: null, endDate: null };
  }

  const parsedDate = parseDate(dateText);
  if (!parsedDate) {
    return { startDate: null, endDate: null };
  }

  if (dateText.toLowerCase().includes("left")) {
    return { startDate: null, endDate: parsedDate };
  }

  if (/^until\s+/i.test(dateText)) {
    return { startDate: null, endDate: parsedDate };
  }

  if (/^from\s+/i.test(dateText)) {
    return { startDate: parsedDate, endDate: null };
  }

  if (status.includes("ended") || status.includes("launched")) {
    return { startDate: null, endDate: parsedDate };
  }

  return { startDate: parsedDate, endDate: null };
}

function buildVestingSummaryFromRound(round: IcoDropsRoundSnapshot): string | null {
  const parts: string[] = [];
  const roundName = cleanText(round.roundName);
  const statusLabel = cleanText(round.statusLabel);
  const dateText = cleanText(round.dateText);

  if (roundName) {
    parts.push(roundName);
  }
  if (statusLabel) {
    parts.push(statusLabel);
  }
  if (dateText) {
    parts.push(dateText);
  }

  const goal = round.infoByTitle.goal;
  if (goal) {
    parts.push(`Goal ${goal}`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

function extractProjectPageEnrichment(html: string): IcoDropsProjectPageEnrichment {
  const officialWebsite = extractOfficialWebsiteFromProjectPage(html);
  const twitter = extractTwitterFromProjectPage(html);
  const whitepaper = extractWhitepaperFromProjectPage(html);
  const description = composeProjectDescription(
    extractOverviewDescriptionFromProjectPage(html),
    extractEcosystemNamesFromProjectPage(html),
    extractMetaDescription(html),
  );
  const rounds = extractRoundSnapshotsFromProjectPage(html);
  const selectedRound = selectPreferredRoundForSaleData(rounds);

  if (!selectedRound) {
    return {
      officialWebsite,
      twitter,
      whitepaper,
      description,
      startDate: null,
      endDate: null,
      salePrice: null,
      fdv: null,
      totalSupply: null,
      vestingSummary: null,
    };
  }

  const roundDates = deriveRoundDates(selectedRound);
  const roundPrice = selectedRound.infoByTitle.price ?? selectedRound.headerPrice;
  const salePrice = roundPrice ? parsePositiveNumber(roundPrice) : null;
  const fdv = parseUsdCompact(selectedRound.infoByTitle["pre-valuation"] ?? "");
  const totalSupply = parseCompactNumber(selectedRound.infoByTitle["tokens for round"] ?? "");
  const vestingSummary = buildVestingSummaryFromRound(selectedRound);

  return {
    officialWebsite,
    twitter,
    whitepaper,
    description,
    startDate: roundDates.startDate,
    endDate: roundDates.endDate,
    salePrice,
    fdv,
    totalSupply,
    vestingSummary,
  };
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

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; crypto-presale-analyzer/1.0)",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `ICO Drops page request failed (${response.status}) for ${url}. ${body.slice(0, 200)}`,
      );
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveProjectPageEnrichment(
  projectPageUrl: string,
): Promise<IcoDropsProjectPageEnrichment | null> {
  try {
    const html = await fetchText(projectPageUrl);
    return extractProjectPageEnrichment(html);
  } catch (error) {
    console.warn(`ICO Drops project details fetch failed for ${projectPageUrl}`, error);
    return null;
  }
}

function extractRows(html: string): string[] {
  const rows: string[] = [];
  const rowPattern = /<li\s+class="Tbl-Row[\s\S]*?(?=<li\s+class="Tbl-Row|$)/g;
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

function normalizeRoundLabel(round: string): string {
  return cleanText(round).toLowerCase();
}

function isLikelyLivePresaleRound(round: string): boolean {
  const normalized = normalizeRoundLabel(round);
  if (!normalized) {
    return false;
  }

  const excluded = [
    "points farming",
    "incentivized activities",
    "incentive activities",
    "possible retrodrop",
    "retrodrop",
    "airdrop",
    "testnet",
    "staking",
    "nft staking",
    "liquidity mining",
    "booster program",
  ];
  if (excluded.some((keyword) => normalized.includes(keyword))) {
    return false;
  }

  const included = [
    "presale",
    "private sale",
    "public sale",
    "token sale",
    "token launch",
    "ico",
    "ido",
    "ieo",
    "launchpad",
    "wallet sale",
    "strategic sale",
    "seed sale",
    "community sale",
    "sale",
  ];

  return included.some((keyword) => normalized.includes(keyword));
}

function normalizeRowToProject(
  rowHtml: string,
  listingType: IcoDropsListingType,
): IngestionProjectRecord | null {
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
  const logoRaw =
    getCapture(/<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>/i, rowHtml) ??
    getCapture(/style=["'][^"']*url\(([^)]+)\)[^"']*["']/i, rowHtml);

  const cleanPath = projectPath.trim();
  const projectPageUrl = normalizeAssetUrl(cleanPath);
  if (!projectPageUrl) {
    return null;
  }

  const slugFromPath = cleanPath.replace(/^\/+|\/+$/g, "");
  const slug = slugFromPath ? slugify(slugFromPath) : slugify(name);
  const ticker = cleanText(tickerRaw).toUpperCase() || slug.slice(0, 8).toUpperCase();
  const round = cleanText(roundRaw);
  const saleDate = cleanText(dateRaw);
  const startDate = parseDate(saleDate);
  const logoUrl = normalizeAssetUrl(logoRaw ? logoRaw.replace(/["']/g, "") : null);
  const status = listingType === "active" ? "live" : "upcoming";
  const statusLabel = listingType === "active" ? "Live" : "Upcoming";

  if (listingType === "active") {
    const maxAgeDays = parsePositiveInt(
      process.env.ICODROPS_ACTIVE_MAX_AGE_DAYS,
      DEFAULT_ACTIVE_PRESALE_MAX_AGE_DAYS,
      MAX_ACTIVE_PRESALE_MAX_AGE_DAYS,
    );
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const tooOld = startDate ? Date.now() - startDate.getTime() > maxAgeMs : true;

    if (!isLikelyLivePresaleRound(round) || tooOld) {
      return null;
    }
  }

  return {
    name,
    slug,
    ticker,
    description: round
      ? `${statusLabel} token sale (${round}) listed on ICO Drops.`
      : `${statusLabel} token sale listed on ICO Drops.`,
    status,
    website: projectPageUrl,
    logo_url: logoUrl,
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

async function enrichProjectsWithOfficialWebsites(
  projects: IngestionProjectRecord[],
): Promise<IngestionProjectRecord[]> {
  if (projects.length === 0) {
    return projects;
  }

  const concurrency = parsePositiveInt(
    process.env.ICODROPS_DETAILS_CONCURRENCY,
    DEFAULT_DETAILS_CONCURRENCY,
    MAX_DETAILS_CONCURRENCY,
  );

  const results = [...projects];
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, projects.length) }, async () => {
      while (true) {
        const index = cursor;
        cursor += 1;

        if (index >= projects.length) {
          return;
        }

        const project = projects[index];
        const enrichment = await resolveProjectPageEnrichment(project.website);
        if (!enrichment) {
          continue;
        }

        results[index] = {
          ...project,
          website:
            enrichment.officialWebsite && isHttpUrl(enrichment.officialWebsite)
              ? enrichment.officialWebsite
              : project.website,
          twitter: enrichment.twitter ?? project.twitter,
          whitepaper: enrichment.whitepaper ?? project.whitepaper,
          description: enrichment.description ?? project.description,
          start_date: project.start_date ?? enrichment.startDate,
          end_date: project.end_date ?? enrichment.endDate,
          fdv: project.fdv ?? enrichment.fdv,
          sale_price: project.sale_price ?? enrichment.salePrice,
          total_supply: project.total_supply ?? enrichment.totalSupply,
          vesting_summary: project.vesting_summary ?? enrichment.vestingSummary,
        };
      }
    }),
  );

  return results;
}

async function getIcoDropsProjectsByListing(
  filterUrl: string,
  listingType: IcoDropsListingType,
): Promise<IngestionProjectRecord[]> {
  const limit = parsePositiveInt(process.env.INGESTION_REAL_LIMIT, DEFAULT_LIMIT, MAX_LIMIT);
  const collected: IngestionProjectRecord[] = [];
  const seen = new Set<string>();

  const firstPage = await fetchJson<IcoDropsFilterResponse>(
    `${filterUrl}?page=1`,
  );

  const totalPages = clamp(firstPage.total_pages || 1, 1, 50);
  const pages = [firstPage];

  for (let page = 2; page <= totalPages && collected.length < limit; page += 1) {
    pages.push(
      await fetchJson<IcoDropsFilterResponse>(
        `${filterUrl}?page=${page}`,
      ),
    );
  }

  for (const page of pages) {
    const rows = extractRows(page.rendered_html);

    for (const row of rows) {
      if (collected.length >= limit) {
        break;
      }

      const normalized = normalizeRowToProject(row, listingType);
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

  return enrichProjectsWithOfficialWebsites(collected);
}

export async function getIcoDropsUpcomingProjects(): Promise<IngestionProjectRecord[]> {
  return getIcoDropsProjectsByListing(ICODROPS_UPCOMING_FILTER_URL, "upcoming");
}

export async function getIcoDropsActiveProjects(): Promise<IngestionProjectRecord[]> {
  return getIcoDropsProjectsByListing(ICODROPS_ACTIVE_FILTER_URL, "active");
}
