import { CLINICAL_THEATRE_API_PATHS as PATHS } from "@/constants/clinical-theatre-api";
import { theatreGet, theatreMutate } from "@/lib/server/theatre-bff";

type Params = { params: Promise<{ uuid: string }> };

export async function GET(request: Request, { params }: Params) {
  const { uuid } = await params;
  return theatreGet(request, PATHS.waitingListEntry(uuid));
}

export async function PATCH(request: Request, { params }: Params) {
  const { uuid } = await params;
  return theatreMutate(request, PATHS.waitingListEntry(uuid), "PATCH");
}
