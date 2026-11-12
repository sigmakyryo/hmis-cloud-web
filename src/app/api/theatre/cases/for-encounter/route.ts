import { CLINICAL_THEATRE_API_PATHS } from "@/constants/clinical-theatre-api";
import { theatreMutate } from "@/lib/server/theatre-bff";

/** Return the theatre encounter's case, setting up a draft one when missing. */
export async function POST(request: Request) {
  return theatreMutate(request, CLINICAL_THEATRE_API_PATHS.caseForEncounter);
}
