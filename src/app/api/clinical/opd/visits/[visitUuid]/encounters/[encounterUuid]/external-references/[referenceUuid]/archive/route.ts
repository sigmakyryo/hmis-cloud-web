import { CLINICAL_OPD_API_PATHS } from "@/constants/clinical-opd-api";
import { handleClinicalAction } from "@/lib/server/clinical-bff-handlers";

type RouteContext = {
  params: Promise<{
    visitUuid: string;
    encounterUuid: string;
    referenceUuid: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { visitUuid, encounterUuid, referenceUuid } = await context.params;
  return handleClinicalAction(
    CLINICAL_OPD_API_PATHS.encounterExternalReferenceArchive(
      visitUuid,
      encounterUuid,
      referenceUuid,
    ),
  );
}
