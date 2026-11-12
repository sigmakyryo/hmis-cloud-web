import { CLINICAL_THEATRE_API_PATHS as PATHS } from "@/constants/clinical-theatre-api";
import { theatreGet } from "@/lib/server/theatre-bff";

export async function GET(request: Request) {
  return theatreGet(request, PATHS.familyBoard);
}
