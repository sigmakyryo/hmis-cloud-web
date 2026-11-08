import { CLINICAL_IPD_API_PATHS } from "@/constants/clinical-ipd-api";
import { ipdGet } from "@/lib/server/ipd-bff";

export async function GET(request: Request) {
  return ipdGet(request, CLINICAL_IPD_API_PATHS.census);
}
