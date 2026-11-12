import { CLINICAL_THEATRE_API_PATHS } from "@/constants/clinical-theatre-api";
import { theatreGet } from "@/lib/server/theatre-bff";

type Params = { params: Promise<{ uuid: string }> };

export async function GET(request: Request, { params }: Params) {
  const { uuid } = await params;
  return theatreGet(request, CLINICAL_THEATRE_API_PATHS.checklist(uuid));
}
