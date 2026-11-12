import { ORGANIZATION_CONTRACTORS_API_PATHS } from "@/constants/organization-contractors-api";
import type {
  CreateOrganizationContractorPayload,
  OrganizationContractor,
} from "@/features/settings/types/settings.types";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { handleClinicalListGet } from "@/lib/server/clinical-bff-handlers";
import { hmisApiRequest } from "@/lib/server/hmis-api";
import { requireTenantAdmin } from "@/lib/server/require-tenant-admin";

const QUERY_KEYS = [
  "page",
  "page_size",
  "search",
  "ordering",
  "is_active",
  "include_inactive",
] as const;

export async function GET(request: Request) {
  return handleClinicalListGet<OrganizationContractor>(
    request,
    ORGANIZATION_CONTRACTORS_API_PATHS.list,
    QUERY_KEYS,
    "user",
    { page_size: "100", ordering: "name" },
  );
}

export async function POST(request: Request) {
  try {
    const admin = await requireTenantAdmin();
    if ("error" in admin) {
      return admin.error;
    }

    const body = (await request.json()) as CreateOrganizationContractorPayload;

    if (!body.name?.trim()) {
      return bffSuccess({ message: "Company name is required." }, 400);
    }

    const contractor = await hmisApiRequest<OrganizationContractor>(
      ORGANIZATION_CONTRACTORS_API_PATHS.list,
      {
        method: "POST",
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

    return bffSuccess(contractor, 201);
  } catch (error) {
    return bffError(error);
  }
}
