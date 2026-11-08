import { CLINICAL_IPD_API_PATHS } from "@/constants/clinical-ipd-api";
import { ipdMutate } from "@/lib/server/ipd-bff";

export async function POST(request: Request) {
  return ipdMutate(request, CLINICAL_IPD_API_PATHS.admit);
}
