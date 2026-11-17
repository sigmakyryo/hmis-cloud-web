import { TENANTS_API_PATHS } from "@/constants/tenants-api";
import type {
  TenantSamlConfig,
  UpdateTenantSamlConfigPayload,
} from "@/features/settings/types/settings.types";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { hmisApiRequest } from "@/lib/server/hmis-api";
import { requireTenantAdmin } from "@/lib/server/require-tenant-admin";

export async function GET() {
  try {
    const admin = await requireTenantAdmin();
    if ("error" in admin) {
      return admin.error;
    }

    const saml = await hmisApiRequest<TenantSamlConfig>(
      TENANTS_API_PATHS.saml(admin.tenantUuid),
      { token: admin.accessToken },
    );

    return bffSuccess({ saml });
  } catch (error) {
    return bffError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireTenantAdmin();
    if ("error" in admin) {
      return admin.error;
    }

    const body = (await request.json()) as UpdateTenantSamlConfigPayload;
    const saml = await hmisApiRequest<TenantSamlConfig>(
      TENANTS_API_PATHS.saml(admin.tenantUuid),
      {
        method: "PUT",
        token: admin.accessToken,
        body,
      },
    );

    return bffSuccess({ saml });
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

    const body = (await request.json()) as UpdateTenantSamlConfigPayload;
    const saml = await hmisApiRequest<TenantSamlConfig>(
      TENANTS_API_PATHS.saml(admin.tenantUuid),
      {
        method: "PATCH",
        token: admin.accessToken,
        body,
      },
    );

    return bffSuccess({ saml });
  } catch (error) {
    return bffError(error);
  }
}
