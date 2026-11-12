import { CLINICAL_IPD_API_PATHS } from "@/constants/clinical-ipd-api";
import { ipdGet, ipdMutate } from "@/lib/server/ipd-bff";

type Params = { params: Promise<{ uuid: string }> };

export async function GET(request: Request, { params }: Params) {
  const { uuid } = await params;
  return ipdGet(request, CLINICAL_IPD_API_PATHS.dischargeSummary(uuid));
}

export async function POST(request: Request, { params }: Params) {
  const { uuid } = await params;
  return ipdMutate(request, CLINICAL_IPD_API_PATHS.dischargeSummary(uuid));
}
