import { db } from "../db";
import { detectRedFlags, type RedFlagItem } from "./index";

export type StoredRedFlags = {
  projectId: string;
  slug: string;
  flags: RedFlagItem[];
};

export async function detectAndStoreAllRedFlags(): Promise<StoredRedFlags[]> {
  const projects = await db.project.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      vesting_summary: true,
    },
    orderBy: {
      created_at: "asc",
    },
  });

  const stored: StoredRedFlags[] = [];

  for (const project of projects) {
    const result = detectRedFlags({
      name: project.name,
      description: project.description,
      vestingSummary: project.vesting_summary,
    });

    await db.$transaction([
      db.redFlag.deleteMany({ where: { project_id: project.id } }),
      ...(result.flags.length > 0
        ? [
            db.redFlag.createMany({
              data: result.flags.map((flag) => ({
                project_id: project.id,
                type: flag.type,
                severity: flag.severity,
                description: flag.description,
              })),
            }),
          ]
        : []),
    ]);

    stored.push({
      projectId: project.id,
      slug: project.slug,
      flags: result.flags,
    });
  }

  return stored;
}
