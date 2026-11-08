import { CLINICAL_IPD_API_PATHS } from "@/constants/clinical-ipd-api";
import { ipdGet, ipdMutate } from "@/lib/server/ipd-bff";

export async function GET(request: Request) {
  return ipdGet(request, CLINICAL_IPD_API_PATHS.emar);
}

export async function POST(request: Request) {
  return ipdMutate(request, CLINICAL_IPD_API_PATHS.emar);
}
