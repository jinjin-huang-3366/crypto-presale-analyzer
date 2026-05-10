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

function parseBoolean(input: string | null | undefined): boolean | undefined {
  const normalized = input?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }

  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }

  return undefined;
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const querySource = parseSource(url.searchParams.get("source"));
    const queryIncludeLive = parseBoolean(url.searchParams.get("include_live"));

    let bodySource: IngestionSource | undefined;
    let bodyIncludeLive: boolean | undefined;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const rawBody = await request.text();
      if (rawBody.trim().length > 0) {
        const body = JSON.parse(rawBody) as { source?: string; include_live?: boolean | string };
        bodySource = parseSource(body.source);
        if (typeof body.include_live === "boolean") {
          bodyIncludeLive = body.include_live;
        } else if (typeof body.include_live === "string") {
          bodyIncludeLive = parseBoolean(body.include_live);
        }
      }
    }

    const result = await syncProjects({
      source: bodySource ?? querySource,
      includeLive: bodyIncludeLive ?? queryIncludeLive ?? false,
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
