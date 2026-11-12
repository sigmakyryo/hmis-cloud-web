import { CLINICAL_THEATRE_API_PATHS as PATHS } from "@/constants/clinical-theatre-api";
import { theatreMutate } from "@/lib/server/theatre-bff";

export async function POST(request: Request) {
  return theatreMutate(request, PATHS.sessionCancelOccurrence);
}
