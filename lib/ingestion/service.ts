import { db } from "../db";
import { getMockIngestionProjects } from "./mock";

export type SyncProjectsResult = {
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

export async function syncProjects(): Promise<SyncProjectsResult> {
  const projects = getMockIngestionProjects();
  const syncedAt = new Date();

  if (projects.length === 0) {
    await storeSyncRun({
      source: "mock",
      inserted: 0,
      updated: 0,
      totalProcessed: 0,
      syncedAt,
    });

    return {
      inserted: 0,
      updated: 0,
      totalProcessed: 0,
      slugs: [],
      message: "No projects available from mock ingestion source.",
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
    source: "mock",
    inserted,
    updated,
    totalProcessed: projects.length,
    syncedAt,
  });

  return {
    inserted,
    updated,
    totalProcessed: projects.length,
    slugs: projects.map((project) => project.slug),
    message: `Synced ${projects.length} projects from mock source.`,
    syncedAt,
  };
}
