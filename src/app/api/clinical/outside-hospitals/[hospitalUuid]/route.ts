import { CLINICAL_OPD_API_PATHS } from "@/constants/clinical-opd-api";
import {
  handleClinicalDelete,
  handleClinicalPatch,
} from "@/lib/server/clinical-bff-handlers";

type RouteContext = {
  params: Promise<{ hospitalUuid: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { hospitalUuid } = await context.params;
  return handleClinicalPatch(
    request,
    CLINICAL_OPD_API_PATHS.outsideHospital(hospitalUuid),
    "admin",
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { hospitalUuid } = await context.params;
  return handleClinicalDelete(
    CLINICAL_OPD_API_PATHS.outsideHospital(hospitalUuid),
    "admin",
  );
}
