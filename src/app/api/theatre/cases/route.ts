import { CLINICAL_THEATRE_API_PATHS } from "@/constants/clinical-theatre-api";
import { theatreGet, theatreMutate } from "@/lib/server/theatre-bff";

export async function GET(request: Request) {
  return theatreGet(request, CLINICAL_THEATRE_API_PATHS.cases);
}

export async function POST(request: Request) {
  return theatreMutate(request, CLINICAL_THEATRE_API_PATHS.cases);
}
