import { TENANTS_API_PATHS } from "@/constants/tenants-api";
import type { TenantBranding } from "@/features/settings/types/settings.types";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { HmisApiError, hmisApiRequest } from "@/lib/server/hmis-api";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { organizationLogoDataUri } from "@/lib/server/portal-logo-sync";
import { absoluteMediaUrl } from "@/lib/server/media-url";
import { requireTenantAdmin } from "@/lib/server/require-tenant-admin";

/**
 * Copies the logo from Settings > Organization into the company portal branding, so the portal
 * sign-in, invitation and sidebar show the same logo. Tenant administrators only.
 */
export async function POST() {
  try {
    const admin = await requireTenantAdmin();
    if ("error" in admin) {
      return admin.error;
    }

    const branding = await hmisApiRequest<TenantBranding>(TENANTS_API_PATHS.branding(admin.tenantUuid), {
      token: admin.accessToken,
    });
    const logoUrl = absoluteMediaUrl(branding.branding_logo_url);
    if (!logoUrl) {
      throw new HmisApiError("Add a logo in Settings > Organization first.", 404);
    }

    const logoDataUri = await organizationLogoDataUri(logoUrl);
    const saved = await ohServiceRequest<unknown>("/oh-portal-admin/branding", {
      method: "PATCH",
      token: admin.accessToken,
      body: { logo_data_uri: logoDataUri },
    });
    return bffSuccess(saved);
  } catch (error) {
    return bffError(error);
  }
}
