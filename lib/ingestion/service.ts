import { db } from "../db";
import { detectAndStoreAllRedFlags } from "../redflags/service";
import { scoreAndStoreAllProjects } from "../scoring/service";
import { getCoinPaprikaIngestionProjects } from "./coinpaprika";
import { getIcoDropsUpcomingProjects } from "./icodrops";
import { getMockIngestionProjects } from "./mock";
import type { IngestionProjectRecord, IngestionSource } from "./types";

export type SyncProjectsResult = {
  source: IngestionSource;
  inserted: number;
  updated: number;
  totalProcessed: number;
  slugs: string[];
  message: string;
  syncedAt: Date;
};

function makeSyncRunId() {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function storeSyncRun(input: {
  source: string;
  inserted: number;
  updated: number;
  totalProcessed: number;
  syncedAt: Date;
}) {
  await db.$executeRaw`
    INSERT INTO "IngestionSyncRun"
      ("id", "source", "inserted_count", "updated_count", "total_processed", "synced_at")
    VALUES
      (${makeSyncRunId()}, ${input.source}, ${input.inserted}, ${input.updated}, ${input.totalProcessed}, ${input.syncedAt})
  `;
}

function normalizedText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function projectDedupeKey(project: IngestionProjectRecord) {
  const ticker = project.ticker.trim().toUpperCase();
  const name = normalizedText(project.name);
  return `${ticker}|${name}`;
}

function isIcoDropsWebsite(website: string): boolean {
  try {
    const hostname = new URL(website.trim()).hostname.toLowerCase();
    return hostname === "icodrops.com" || hostname.endsWith(".icodrops.com");
  } catch {
    return false;
  }
}

function pickPreferredWebsite(primary: string, secondary: string): string {
  const primaryTrimmed = primary.trim();
  const secondaryTrimmed = secondary.trim();

  if (!secondaryTrimmed) {
    return primaryTrimmed;
  }

  if (!primaryTrimmed) {
    return secondaryTrimmed;
  }

  if (isPlaceholderWebsite(primaryTrimmed) && !isPlaceholderWebsite(secondaryTrimmed)) {
    return secondaryTrimmed;
  }

  if (isIcoDropsWebsite(primaryTrimmed) && !isIcoDropsWebsite(secondaryTrimmed)) {
    return secondaryTrimmed;
  }

  return primaryTrimmed;
}

function mergeProjectRecord(
  primary: IngestionProjectRecord,
  secondary: IngestionProjectRecord,
): IngestionProjectRecord {
  return {
    ...primary,
    description:
      primary.description.trim().length > 0 ? primary.description : secondary.description,
    website: pickPreferredWebsite(primary.website, secondary.website),
    logo_url: primary.logo_url ?? secondary.logo_url,
    twitter: primary.twitter ?? secondary.twitter,
    whitepaper: primary.whitepaper ?? secondary.whitepaper,
    start_date: primary.start_date ?? secondary.start_date,
    end_date: primary.end_date ?? secondary.end_date,
    fdv: primary.fdv ?? secondary.fdv,
    sale_price: primary.sale_price ?? secondary.sale_price,
    total_supply: primary.total_supply ?? secondary.total_supply,
    vesting_summary: primary.vesting_summary ?? secondary.vesting_summary,
  };
}

function mergeProjectLists(
  primary: IngestionProjectRecord[],
  secondary: IngestionProjectRecord[],
): IngestionProjectRecord[] {
  const merged = [...primary];
  const indexByKey = new Map<string, number>();
  const indexBySlug = new Map<string, number>();

  merged.forEach((project, index) => {
    indexBySlug.set(project.slug, index);
    indexByKey.set(projectDedupeKey(project), index);
  });

  for (const project of secondary) {
    const slugMatchIndex = indexBySlug.get(project.slug);
    if (slugMatchIndex !== undefined) {
      merged[slugMatchIndex] = mergeProjectRecord(merged[slugMatchIndex], project);
      continue;
    }

    const dedupeKey = projectDedupeKey(project);
    const existingIndex = indexByKey.get(dedupeKey);

    if (existingIndex !== undefined) {
      merged[existingIndex] = mergeProjectRecord(merged[existingIndex], project);
      continue;
    }

    indexBySlug.set(project.slug, merged.length);
    indexByKey.set(dedupeKey, merged.length);
    merged.push(project);
  }

  return merged;
}

function resolveIngestionSource(
  inputSource: IngestionSource | undefined,
): IngestionSource {
  if (inputSource) {
    return inputSource;
  }

  const envSource = process.env.INGESTION_SOURCE?.trim().toLowerCase();
  if (
    envSource === "mock" ||
    envSource === "coinpaprika" ||
    envSource === "icodrops" ||
    envSource === "auto"
  ) {
    return envSource;
  }

  return "auto";
}

async function loadProjectsBySource(source: IngestionSource): Promise<{
  sourceUsed: IngestionSource;
  projects: IngestionProjectRecord[];
  fallbackMessage: string | null;
}> {
  if (source === "mock") {
    return {
      sourceUsed: "mock",
      projects: getMockIngestionProjects(),
      fallbackMessage: null,
    };
  }

  if (source === "coinpaprika") {
    return {
      sourceUsed: "coinpaprika",
      projects: await getCoinPaprikaIngestionProjects(),
      fallbackMessage: null,
    };
  }

  if (source === "icodrops") {
    return {
      sourceUsed: "icodrops",
      projects: await getIcoDropsUpcomingProjects(),
      fallbackMessage: null,
    };
  }

  const [icodropsResult, coinpaprikaResult] = await Promise.allSettled([
    getIcoDropsUpcomingProjects(),
    getCoinPaprikaIngestionProjects(),
  ]);

  const fallbackNotes: string[] = [];
  let icodropsProjects: IngestionProjectRecord[] = [];
  let coinpaprikaProjects: IngestionProjectRecord[] = [];

  if (icodropsResult.status === "fulfilled") {
    icodropsProjects = icodropsResult.value;
  } else {
    console.error("ICO Drops ingestion failed in auto mode.", icodropsResult.reason);
    fallbackNotes.push("ICO Drops fetch failed.");
  }

  if (coinpaprikaResult.status === "fulfilled") {
    coinpaprikaProjects = coinpaprikaResult.value;
  } else {
    console.error("CoinPaprika ingestion failed in auto mode.", coinpaprikaResult.reason);
    fallbackNotes.push("CoinPaprika fetch failed.");
  }

  if (icodropsProjects.length === 0 && coinpaprikaProjects.length === 0) {
    throw new Error(
      "Automatic real-data sync failed for both ICO Drops and CoinPaprika. Use source=mock only when test data is intentionally needed.",
    );
  }

  const mergedProjects = mergeProjectLists(icodropsProjects, coinpaprikaProjects);
  const failureNote =
    fallbackNotes.length > 0
      ? `${fallbackNotes.join(" ")} Auto mode merged whatever source data remained available.`
      : null;

  return {
    sourceUsed: "auto",
    projects: mergedProjects,
    fallbackMessage: failureNote,
  };
}

function isPlaceholderWebsite(website: string) {
  const trimmed = website.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const hostname = new URL(trimmed).hostname.toLowerCase();
    return hostname === "example" || hostname.endsWith(".example");
  } catch {
    return false;
  }
}

async function prunePlaceholderProjects() {
  const projects = await db.project.findMany({
    select: {
      id: true,
      website: true,
    },
  });

  const idsToDelete = projects
    .filter((project) => isPlaceholderWebsite(project.website))
    .map((project) => project.id);

  if (idsToDelete.length === 0) {
    return 0;
  }

  const result = await db.project.deleteMany({
    where: {
      id: {
        in: idsToDelete,
      },
    },
  });

  return result.count;
}

export async function syncProjects(options?: {
  source?: IngestionSource;
}): Promise<SyncProjectsResult> {
  const requestedSource = resolveIngestionSource(options?.source);
  const { sourceUsed, projects, fallbackMessage } =
    await loadProjectsBySource(requestedSource);
  const syncedAt = new Date();

  if (projects.length === 0) {
    await storeSyncRun({
      source: sourceUsed,
      inserted: 0,
      updated: 0,
      totalProcessed: 0,
      syncedAt,
    });

    return {
      source: sourceUsed,
      inserted: 0,
      updated: 0,
      totalProcessed: 0,
      slugs: [],
      message: `No projects available from ${sourceUsed} ingestion source.`,
      syncedAt,
    };
  }

  const removedPlaceholderCount =
    sourceUsed === "mock" ? 0 : await prunePlaceholderProjects();

  const existingProjects = await db.project.findMany({
    where: {
      slug: {
        in: projects.map((project) => project.slug),
      },
    },
    select: {
      slug: true,
    },
  });

  const existingSlugs = new Set(existingProjects.map((project) => project.slug));
  let inserted = 0;
  let updated = 0;

  for (const project of projects) {
    const { slug, ...rest } = project;
    const isUpdate = existingSlugs.has(slug);

    await db.project.upsert({
      where: { slug },
      create: {
        slug,
        ...rest,
      },
      update: rest,
    });

    if (isUpdate) {
      updated += 1;
    } else {
      inserted += 1;
      existingSlugs.add(slug);
    }
  }

  await storeSyncRun({
    source: sourceUsed,
    inserted,
    updated,
    totalProcessed: projects.length,
    syncedAt,
  });

  // Refresh downstream analysis data after ingestion so UI/API never show stale or null scores.
  await detectAndStoreAllRedFlags();
  const scored = await scoreAndStoreAllProjects();

  const fallbackNote = fallbackMessage ? ` ${fallbackMessage}` : "";
  const cleanupNote =
    removedPlaceholderCount > 0
      ? ` Removed ${removedPlaceholderCount} placeholder project(s) from prior mock/seed data.`
      : "";

  return {
    source: sourceUsed,
    inserted,
    updated,
    totalProcessed: projects.length,
    slugs: projects.map((project) => project.slug),
    message: `Synced ${projects.length} projects from ${sourceUsed} source and scored ${scored.length} projects.${cleanupNote}${fallbackNote}`,
    syncedAt,
  };
}
