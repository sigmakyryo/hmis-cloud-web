import { CLINICAL_THEATRE_API_PATHS } from "@/constants/clinical-theatre-api";
import { theatreMutate } from "@/lib/server/theatre-bff";

type Params = { params: Promise<{ uuid: string; stage: string }> };

export async function POST(request: Request, { params }: Params) {
  const { uuid, stage } = await params;
  return theatreMutate(
    request,
    CLINICAL_THEATRE_API_PATHS.checklistStage(uuid, stage),
  );
}
