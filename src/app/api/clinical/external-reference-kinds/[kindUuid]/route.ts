import { CLINICAL_OPD_API_PATHS } from "@/constants/clinical-opd-api";
import {
  handleClinicalDelete,
  handleClinicalPatch,
} from "@/lib/server/clinical-bff-handlers";

type RouteContext = {
  params: Promise<{ kindUuid: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { kindUuid } = await context.params;
  return handleClinicalPatch(
    request,
    CLINICAL_OPD_API_PATHS.externalReferenceKind(kindUuid),
    "admin",
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { kindUuid } = await context.params;
  return handleClinicalDelete(
    CLINICAL_OPD_API_PATHS.externalReferenceKind(kindUuid),
    "admin",
  );
}
