import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function buildUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: buildUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: buildUrl("/projects"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: buildUrl("/compare"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  try {
    const projects = await db.project.findMany({
      select: {
        slug: true,
        updated_at: true,
      },
      orderBy: {
        updated_at: "desc",
      },
    });

    return [
      ...staticEntries,
      ...projects.map((project) => ({
        url: buildUrl(`/projects/${project.slug}`),
        lastModified: project.updated_at,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ];
  } catch (error) {
    console.error("Failed to generate sitemap from projects", error);
    return staticEntries;
  }
}
