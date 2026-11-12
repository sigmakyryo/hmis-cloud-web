import { NextRequest, NextResponse } from "next/server";
import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { ohServiceRequest } from "@/lib/server/oh-service";

type Ctx = { params: Promise<{ uuid: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
  const { uuid } = await context.params;
  try {
    const data = await ohServiceRequest(
      OCCUPATIONAL_HEALTH_API_PATHS.ohImmExportPack(uuid),
      { method: "GET" },
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
