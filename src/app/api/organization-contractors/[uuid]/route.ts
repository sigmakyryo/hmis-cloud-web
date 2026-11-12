import { ORGANIZATION_CONTRACTORS_API_PATHS } from "@/constants/organization-contractors-api";
import type {
  OrganizationContractor,
  UpdateOrganizationContractorPayload,
} from "@/features/settings/types/settings.types";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { hmisApiRequest } from "@/lib/server/hmis-api";
import { requireTenantAdmin } from "@/lib/server/require-tenant-admin";

type RouteContext = {
  params: Promise<{ uuid: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireTenantAdmin();
    if ("error" in admin) {
      return admin.error;
    }

    const { uuid } = await context.params;
    const body = (await request.json()) as UpdateOrganizationContractorPayload;

    if (!body.name?.trim()) {
      return bffSuccess({ message: "Company name is required." }, 400);
    }

    const contractor = await hmisApiRequest<OrganizationContractor>(
      ORGANIZATION_CONTRACTORS_API_PATHS.detail(uuid),
      {
        method: "PATCH",
        token: admin.accessToken,
        body: {
          name: body.name.trim(),
          code: body.code?.trim().toUpperCase() || "",
          contact_person: body.contact_person?.trim() || "",
          phone_number: body.phone_number?.trim() || "",
          email: body.email?.trim() || "",
          address: body.address?.trim() || "",
          is_active: body.is_active ?? true,
        },
      },
    );

    return bffSuccess(contractor);
  } catch (error) {
    return bffError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const admin = await requireTenantAdmin();
    if ("error" in admin) {
      return admin.error;
    }

    const { uuid } = await context.params;
    await hmisApiRequest(ORGANIZATION_CONTRACTORS_API_PATHS.detail(uuid), {
      method: "DELETE",
      token: admin.accessToken,
    });

    return bffSuccess({ detail: "Contractor deactivated." });
  } catch (error) {
    return bffError(error);
  }
}
