import { ohProxyGetHandler } from "@/lib/server/occupational-health-bff";

export async function GET(request: Request) {
  return ohProxyGetHandler("/oh/visit-eligibility", request, ["customer_uuid"]);
}
