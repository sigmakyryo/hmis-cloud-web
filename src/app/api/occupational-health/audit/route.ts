import { fitnessAuditProxy } from "@/lib/server/fitness-bff";

export async function GET(request: Request) {
  return fitnessAuditProxy.proxy("GET", request, ["oh-audit"]);
}
