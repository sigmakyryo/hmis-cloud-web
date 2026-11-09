import { NextRequest, NextResponse } from "next/server";
import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { ohServiceRequest } from "@/lib/server/oh-service";

type Ctx = { params: Promise<{ customerUuid: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
  const { customerUuid } = await context.params;
  try {
    const data = await ohServiceRequest(
      OCCUPATIONAL_HEALTH_API_PATHS.ohImmPatientTitres(customerUuid),
      { method: "GET" },
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
