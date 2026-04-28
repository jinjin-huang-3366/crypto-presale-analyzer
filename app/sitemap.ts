import type { MetadataRoute } from "next";
import { buildSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: buildSiteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: buildSiteUrl("/projects"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: buildSiteUrl("/compare"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  try {
    const { db } = await import("@/lib/db");
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
        url: buildSiteUrl(`/projects/${project.slug}`),
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
