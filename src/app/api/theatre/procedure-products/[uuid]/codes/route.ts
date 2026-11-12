import { CLINICAL_THEATRE_API_PATHS } from "@/constants/clinical-theatre-api";
import { theatreGet, theatreMutate } from "@/lib/server/theatre-bff";

type Params = { params: Promise<{ uuid: string }> };

export async function GET(request: Request, { params }: Params) {
  const { uuid } = await params;
  return theatreGet(request, CLINICAL_THEATRE_API_PATHS.procedureProductCodes(uuid));
}

export async function PUT(request: Request, { params }: Params) {
  const { uuid } = await params;
  return theatreMutate(
    request,
    CLINICAL_THEATRE_API_PATHS.procedureProductCodes(uuid),
    "PUT",
  );
}
