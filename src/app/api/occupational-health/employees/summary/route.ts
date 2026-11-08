import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { ohSummaryGetHandler } from "@/lib/server/occupational-health-bff";

export async function GET() {
  return ohSummaryGetHandler(OCCUPATIONAL_HEALTH_API_PATHS.ohEmployeesSummary);
}
