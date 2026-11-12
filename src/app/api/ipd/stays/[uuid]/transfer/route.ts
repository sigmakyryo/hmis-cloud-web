import { CLINICAL_IPD_API_PATHS } from "@/constants/clinical-ipd-api";
import { ipdMutate } from "@/lib/server/ipd-bff";

type Params = { params: Promise<{ uuid: string }> };

export async function POST(request: Request, { params }: Params) {
  const { uuid } = await params;
  return ipdMutate(request, CLINICAL_IPD_API_PATHS.transfer(uuid));
}
