import { CLINICAL_IPD_API_PATHS } from "@/constants/clinical-ipd-api";
import { ipdGet } from "@/lib/server/ipd-bff";

type Params = { params: Promise<{ uuid: string }> };

export async function GET(request: Request, { params }: Params) {
  const { uuid } = await params;
  return ipdGet(request, CLINICAL_IPD_API_PATHS.stay(uuid));
}
