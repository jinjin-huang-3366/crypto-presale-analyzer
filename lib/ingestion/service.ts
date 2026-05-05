import { db } from "../db";
import { detectAndStoreAllRedFlags } from "../redflags/service";
import { scoreAndStoreAllProjects } from "../scoring/service";
import { getCoinPaprikaIngestionProjects } from "./coinpaprika";
import { getIcoDropsUpcomingProjects } from "./icodrops";
import { getMockIngestionProjects } from "./mock";
import type { IngestionProjectRecord, IngestionSource } from "./types";

export type SyncProjectsResult = {
  source: "mock" | "coinpaprika" | "icodrops";
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
  sourceUsed: "mock" | "coinpaprika" | "icodrops";
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

  try {
    return {
      sourceUsed: "icodrops",
      projects: await getIcoDropsUpcomingProjects(),
      fallbackMessage: null,
    };
  } catch (error) {
    console.error("ICO Drops ingestion failed. Falling back to mock source.", error);
    return {
      sourceUsed: "mock",
      projects: getMockIngestionProjects(),
      fallbackMessage:
        "ICO Drops fetch failed; sync automatically fell back to mock source.",
    };
  }
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

  return {
    source: sourceUsed,
    inserted,
    updated,
    totalProcessed: projects.length,
    slugs: projects.map((project) => project.slug),
    message: `Synced ${projects.length} projects from ${sourceUsed} source and scored ${scored.length} projects.${fallbackNote}`,
    syncedAt,
  };
}
