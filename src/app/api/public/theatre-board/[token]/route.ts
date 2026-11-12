import { NextResponse } from "next/server";

import { CLINICAL_THEATRE_API_PATHS as PATHS } from "@/constants/clinical-theatre-api";
import type { TheatrePublicFamilyBoard } from "@/features/clinical-theatre/types/theatre-p4.types";
import { HmisApiError, hmisApiRequest } from "@/lib/server/hmis-api";

type Params = { params: Promise<{ token: string }> };

const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/**
 * Public kiosk feed (no login). Only the board title and code / stage rows
 * are passed through, even if the upstream ever returned more.
 */
export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ message: "Not found." }, { status: 404, headers: PRIVATE_HEADERS });
  }
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const data = await hmisApiRequest<TheatrePublicFamilyBoard>(PATHS.publicFamilyBoard(token), {
      headers: forwarded ? { "X-Forwarded-For": forwarded } : {},
    });
    const body: TheatrePublicFamilyBoard = {
      title: String(data?.title ?? ""),
      refresh_seconds: Number(data?.refresh_seconds ?? 30),
      generated_at: String(data?.generated_at ?? ""),
      entries: (data?.entries ?? []).map((entry) => ({
        code: String(entry.code ?? ""),
        stage: entry.stage,
        stage_label: String(entry.stage_label ?? ""),
      })),
    };
    return NextResponse.json(body, { headers: PRIVATE_HEADERS });
  } catch (error) {
    const status = error instanceof HmisApiError && error.status === 429 ? 429 : 404;
    const message = status === 429 ? "Too many requests." : "Not found.";
    return NextResponse.json({ message }, { status, headers: PRIVATE_HEADERS });
  }
}
