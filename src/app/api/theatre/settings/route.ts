import { CLINICAL_THEATRE_API_PATHS as PATHS } from "@/constants/clinical-theatre-api";
import { theatreGet, theatreMutate } from "@/lib/server/theatre-bff";

export async function GET(request: Request) {
  return theatreGet(request, PATHS.settings);
}

export async function PATCH(request: Request) {
  return theatreMutate(request, PATHS.settings, "PATCH");
}
