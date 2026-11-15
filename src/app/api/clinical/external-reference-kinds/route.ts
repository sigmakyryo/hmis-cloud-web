import { CLINICAL_OPD_API_PATHS } from "@/constants/clinical-opd-api";
import {
  handleClinicalCreate,
  handleClinicalObjectGet,
} from "@/lib/server/clinical-bff-handlers";

export async function GET(request: Request) {
  return handleClinicalObjectGet(
    request,
    CLINICAL_OPD_API_PATHS.externalReferenceKinds,
    [],
    "admin",
  );
}

export async function POST(request: Request) {
  return handleClinicalCreate(
    request,
    CLINICAL_OPD_API_PATHS.externalReferenceKinds,
    "admin",
    "reference kind",
  );
}
