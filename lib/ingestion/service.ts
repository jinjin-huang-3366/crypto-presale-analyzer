import { db } from "../db";
import { detectAndStoreAllRedFlags } from "../redflags/service";
import { scoreAndStoreAllProjects } from "../scoring/service";
import { getCoinPaprikaIngestionProjects } from "./coinpaprika";
import {
  getIcoDropsActiveProjects,
  getIcoDropsUpcomingProjects,
} from "./icodrops";
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
  options?: {
    appendSecondaryUnknown?: boolean;
  },
): IngestionProjectRecord[] {
  const appendSecondaryUnknown = options?.appendSecondaryUnknown ?? true;
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

    if (!appendSecondaryUnknown) {
      continue;
    }

    indexBySlug.set(project.slug, merged.length);
    indexByKey.set(dedupeKey, merged.length);
    merged.push(project);
  }

  return merged;
}

function normalizedStatus(status: string) {
  return status.trim().toLowerCase();
}

function isUpcomingProject(project: IngestionProjectRecord, nowMs: number): boolean {
  const status = normalizedStatus(project.status);

  if (status === "upcoming") {
    return true;
  }

  if (status === "ended") {
    return false;
  }

  if (project.start_date) {
    return project.start_date.getTime() > nowMs;
  }

  return false;
}

function isLiveProject(project: IngestionProjectRecord, nowMs: number): boolean {
  const status = normalizedStatus(project.status);

  if (status === "ended") {
    return false;
  }

  if (status === "live") {
    return true;
  }

  if (status === "upcoming") {
    return false;
  }

  if (project.end_date && project.end_date.getTime() <= nowMs) {
    return false;
  }

  if (project.start_date) {
    return project.start_date.getTime() <= nowMs;
  }

  return false;
}

function filterProjectsByStatusWindow(
  projects: IngestionProjectRecord[],
  includeLive: boolean,
): {
  projects: IngestionProjectRecord[];
  excludedCount: number;
} {
  const nowMs = Date.now();
  const filteredProjects = projects.filter((project) => {
    if (isUpcomingProject(project, nowMs)) {
      return true;
    }
    if (!includeLive) {
      return false;
    }
    return isLiveProject(project, nowMs);
  });

  return {
    projects: filteredProjects,
    excludedCount: projects.length - filteredProjects.length,
  };
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
    const [upcoming, active] = await Promise.all([
      getIcoDropsUpcomingProjects(),
      getIcoDropsActiveProjects(),
    ]);
    return {
      sourceUsed: "icodrops",
      projects: mergeProjectLists(upcoming, active),
      fallbackMessage: null,
    };
  }

  const [icodropsResult, coinpaprikaResult] = await Promise.allSettled([
    Promise.all([getIcoDropsUpcomingProjects(), getIcoDropsActiveProjects()]).then(
      ([upcoming, active]) => mergeProjectLists(upcoming, active),
    ),
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

  // Keep auto mode presale-focused: only use CoinPaprika to enrich overlapping ICO Drops records.
  const mergedProjects = mergeProjectLists(icodropsProjects, coinpaprikaProjects, {
    appendSecondaryUnknown: false,
  });
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

async function pruneProjectsOutsideStatusWindow(includeLive: boolean) {
  const result = includeLive
    ? await db.project.deleteMany({
        where: {
          status: {
            notIn: ["upcoming", "live"],
          },
        },
      })
    : await db.project.deleteMany({
        where: {
          status: {
            not: "upcoming",
          },
        },
      });

  return result.count;
}

async function pruneLiveProjectsNotInCurrentFeed(currentSlugs: string[]) {
  if (currentSlugs.length === 0) {
    return 0;
  }

  const result = await db.project.deleteMany({
    where: {
      status: "live",
      slug: {
        notIn: currentSlugs,
      },
    },
  });

  return result.count;
}

export async function syncProjects(options?: {
  source?: IngestionSource;
  includeLive?: boolean;
}): Promise<SyncProjectsResult> {
  const requestedSource = resolveIngestionSource(options?.source);
  const includeLive = options?.includeLive ?? false;
  const { sourceUsed, projects: loadedProjects, fallbackMessage } =
    await loadProjectsBySource(requestedSource);
  const { projects, excludedCount } = filterProjectsByStatusWindow(
    loadedProjects,
    includeLive,
  );
  const syncedAt = new Date();
  const statusWindowLabel = includeLive ? "upcoming/live" : "upcoming";
  const excludedLabel = includeLive ? "out-of-window" : "non-upcoming";

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
      message:
        excludedCount > 0
          ? `No ${statusWindowLabel} projects available from ${sourceUsed} ingestion source. Excluded ${excludedCount} ${excludedLabel} project(s).`
          : `No projects available from ${sourceUsed} ingestion source.`,
      syncedAt,
    };
  }

  const removedPlaceholderCount =
    sourceUsed === "mock" ? 0 : await prunePlaceholderProjects();
  const removedOutOfWindowCount =
    sourceUsed === "mock" ? 0 : await pruneProjectsOutsideStatusWindow(includeLive);
  const removedStaleLiveCount =
    !includeLive || sourceUsed === "mock" || sourceUsed === "coinpaprika"
      ? 0
      : await pruneLiveProjectsNotInCurrentFeed(projects.map((project) => project.slug));

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
  const outOfWindowCleanupNote =
    removedOutOfWindowCount > 0
      ? ` Removed ${removedOutOfWindowCount} ${excludedLabel} project(s) from prior sync data.`
      : "";
  const staleLiveCleanupNote =
    removedStaleLiveCount > 0
      ? ` Removed ${removedStaleLiveCount} stale live market project(s) that were not present in the latest presale feed.`
      : "";
  const exclusionNote =
    excludedCount > 0
      ? ` Excluded ${excludedCount} ${excludedLabel} project(s) from the latest source payload.`
      : "";

  return {
    source: sourceUsed,
    inserted,
    updated,
    totalProcessed: projects.length,
    slugs: projects.map((project) => project.slug),
    message: `Synced ${projects.length} ${statusWindowLabel} projects from ${sourceUsed} source and scored ${scored.length} projects.${cleanupNote}${outOfWindowCleanupNote}${staleLiveCleanupNote}${exclusionNote}${fallbackNote}`,
    syncedAt,
  };
}
