import { CLINICAL_THEATRE_API_PATHS } from "@/constants/clinical-theatre-api";
import { theatreMutate } from "@/lib/server/theatre-bff";

type Params = { params: Promise<{ uuid: string; procedureUuid: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { uuid, procedureUuid } = await params;
  return theatreMutate(
    request,
    CLINICAL_THEATRE_API_PATHS.procedure(uuid, procedureUuid),
    "PATCH",
  );
}

export async function DELETE(request: Request, { params }: Params) {
  const { uuid, procedureUuid } = await params;
  return theatreMutate(
    request,
    CLINICAL_THEATRE_API_PATHS.procedure(uuid, procedureUuid),
    "DELETE",
  );
}
