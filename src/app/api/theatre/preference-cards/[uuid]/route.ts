import { CLINICAL_THEATRE_API_PATHS } from "@/constants/clinical-theatre-api";
import { theatreGet, theatreMutate } from "@/lib/server/theatre-bff";

type Params = { params: Promise<{ uuid: string }> };

export async function GET(request: Request, { params }: Params) {
  const { uuid } = await params;
  return theatreGet(request, CLINICAL_THEATRE_API_PATHS.preferenceCard(uuid));
}

export async function PATCH(request: Request, { params }: Params) {
  const { uuid } = await params;
  return theatreMutate(request, CLINICAL_THEATRE_API_PATHS.preferenceCard(uuid), "PATCH");
}

export async function DELETE(request: Request, { params }: Params) {
  const { uuid } = await params;
  return theatreMutate(request, CLINICAL_THEATRE_API_PATHS.preferenceCard(uuid), "DELETE");
}
