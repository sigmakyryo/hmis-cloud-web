import { CLINICAL_OPD_API_PATHS } from "@/constants/clinical-opd-api";
import { handleClinicalUpload } from "@/lib/server/clinical-bff-upload";

type RouteContext = {
  params: Promise<{
    visitUuid: string;
    encounterUuid: string;
    transferUuid: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { visitUuid, encounterUuid, transferUuid } = await context.params;
  return handleClinicalUpload(
    request,
    CLINICAL_OPD_API_PATHS.encounterExternalTransferDocuments(
      visitUuid,
      encounterUuid,
      transferUuid,
    ),
  );
}
