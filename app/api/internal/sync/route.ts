import { NextResponse } from "next/server";
import { syncProjects } from "@/lib/ingestion";
import type { IngestionSource } from "@/lib/ingestion";

export const dynamic = "force-dynamic";

function parseSource(input: string | null | undefined): IngestionSource | undefined {
  const normalized = input?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (
    normalized === "auto" ||
    normalized === "mock" ||
    normalized === "coinpaprika" ||
    normalized === "icodrops"
  ) {
    return normalized;
  }
  return undefined;
}

export async function POST(request: Request) {
  try {
    const querySource = parseSource(new URL(request.url).searchParams.get("source"));

    let bodySource: IngestionSource | undefined;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const rawBody = await request.text();
      if (rawBody.trim().length > 0) {
        const body = JSON.parse(rawBody) as { source?: string };
        bodySource = parseSource(body.source);
      }
    }

    const result = await syncProjects({
      source: bodySource ?? querySource,
    });
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
