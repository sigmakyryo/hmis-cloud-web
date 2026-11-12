import { CLINICAL_THEATRE_API_PATHS as PATHS } from "@/constants/clinical-theatre-api";
import { theatreGet, theatreMutate } from "@/lib/server/theatre-bff";

type Params = { params: Promise<{ uuid: string }> };

export async function GET(request: Request, { params }: Params) {
  const { uuid } = await params;
  return theatreGet(request, PATHS.timings(uuid));
}

export async function POST(request: Request, { params }: Params) {
  const { uuid } = await params;
  return theatreMutate(request, PATHS.timings(uuid));
}
