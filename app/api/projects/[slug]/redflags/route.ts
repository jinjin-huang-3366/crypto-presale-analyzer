import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

type RedFlagResponseItem = {
  id: string;
  type: string;
  severity: string;
  description: string;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;

  try {
    const project = await db.project.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        red_flags: {
          orderBy: [{ severity: "desc" }, { type: "asc" }],
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({
      project_id: project.id,
      slug: project.slug,
      redflags: project.red_flags.map((flag: RedFlagResponseItem) => ({
        id: flag.id,
        type: flag.type,
        severity: flag.severity,
        description: flag.description,
      })),
    });
  } catch (error) {
    console.error(`GET /api/projects/${slug}/redflags failed`, error);
    return NextResponse.json(
      { error: "Failed to load project red flags." },
      { status: 500 },
    );
  }
}
