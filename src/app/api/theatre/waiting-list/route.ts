import { CLINICAL_THEATRE_API_PATHS as PATHS } from "@/constants/clinical-theatre-api";
import { theatreGet, theatreMutate } from "@/lib/server/theatre-bff";

export async function GET(request: Request) {
  return theatreGet(request, PATHS.waitingList);
}

export async function POST(request: Request) {
  return theatreMutate(request, PATHS.waitingList);
}
