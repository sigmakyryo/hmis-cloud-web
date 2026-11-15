import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Liveness probe for Docker / Traefik. Does not call upstream services —
 * readiness of Django/OH is enforced by the BFF routes that need them.
 */
export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "hmis-web",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
