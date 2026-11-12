import { NextResponse } from "next/server";

import { TENANTS_API_PATHS } from "@/constants/tenants-api";
import type { OrganizationType } from "@/features/settings/utils/organization-type";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { hmisApiRequest } from "@/lib/server/hmis-api";
import { requireTenantAdmin } from "@/lib/server/require-tenant-admin";

type OrganizationTypePayload = {
  organization_type: OrganizationType;
};

export async function GET() {
  try {
    const admin = await requireTenantAdmin();
    if ("error" in admin) {
      return admin.error;
    }

    const data = await hmisApiRequest<OrganizationTypePayload>(
      TENANTS_API_PATHS.organizationType(admin.tenantUuid),
      { token: admin.accessToken },
    );

    return bffSuccess({ organization_type: data.organization_type });
  } catch (error) {
    return bffError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireTenantAdmin();
    if ("error" in admin) {
      return admin.error;
    }

    const body = (await request.json()) as OrganizationTypePayload;
    const organizationType = body.organization_type?.trim();

    if (organizationType !== "public" && organizationType !== "employee") {
      return NextResponse.json(
        { message: "Organization type must be public or employee." },
        { status: 400 },
      );
    }

    const data = await hmisApiRequest<OrganizationTypePayload>(
      TENANTS_API_PATHS.organizationType(admin.tenantUuid),
      {
        method: "PATCH",
        token: admin.accessToken,
        body: { organization_type: organizationType },
      },
    );

    return bffSuccess({ organization_type: data.organization_type });
  } catch (error) {
    return bffError(error);
  }
}
