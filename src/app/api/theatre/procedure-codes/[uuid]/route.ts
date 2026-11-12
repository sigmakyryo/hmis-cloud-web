import { CLINICAL_THEATRE_API_PATHS } from "@/constants/clinical-theatre-api";
import { theatreMutate } from "@/lib/server/theatre-bff";

type Params = { params: Promise<{ uuid: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { uuid } = await params;
  return theatreMutate(request, CLINICAL_THEATRE_API_PATHS.procedureCode(uuid), "PATCH");
}
