import { NextResponse } from "next/server";
import { syncProjects } from "@/lib/ingestion";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await syncProjects();
    const { syncedAt, ...payload } = result;

    return NextResponse.json({
      ...payload,
      synced_at: syncedAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/internal/sync failed", error);
    return NextResponse.json(
      { error: "Failed to sync projects." },
      { status: 500 },
    );
  }
}
