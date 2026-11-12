import { CLINICAL_THEATRE_API_PATHS as PATHS } from "@/constants/clinical-theatre-api";
import { theatreMutate } from "@/lib/server/theatre-bff";

type Params = { params: Promise<{ uuid: string; itemUuid: string }> };

export async function POST(request: Request, { params }: Params) {
  const { uuid, itemUuid } = await params;
  return theatreMutate(request, PATHS.caseTrayRelease(uuid, itemUuid));
}
