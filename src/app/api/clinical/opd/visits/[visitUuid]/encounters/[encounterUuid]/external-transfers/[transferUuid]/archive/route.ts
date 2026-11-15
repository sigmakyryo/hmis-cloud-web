import { CLINICAL_OPD_API_PATHS } from "@/constants/clinical-opd-api";
import { handleClinicalAction } from "@/lib/server/clinical-bff-handlers";

type RouteContext = {
  params: Promise<{
    visitUuid: string;
    encounterUuid: string;
    transferUuid: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { visitUuid, encounterUuid, transferUuid } = await context.params;
  return handleClinicalAction(
    CLINICAL_OPD_API_PATHS.encounterExternalTransferArchive(
      visitUuid,
      encounterUuid,
      transferUuid,
    ),
  );
}
