import { CLINICAL_OPD_API_PATHS } from "@/constants/clinical-opd-api";
import { handleClinicalUpload } from "@/lib/server/clinical-bff-upload";

type RouteContext = {
  params: Promise<{
    visitUuid: string;
    encounterUuid: string;
    referenceUuid: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { visitUuid, encounterUuid, referenceUuid } = await context.params;
  return handleClinicalUpload(
    request,
    CLINICAL_OPD_API_PATHS.encounterExternalReferenceDocuments(
      visitUuid,
      encounterUuid,
      referenceUuid,
    ),
  );
}
