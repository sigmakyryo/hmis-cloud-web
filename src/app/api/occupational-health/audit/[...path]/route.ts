import { fitnessAuditProxy } from "@/lib/server/fitness-bff";
import { ohModuleRouteHandlers } from "@/lib/server/oh-module-bff";

const handlers = ohModuleRouteHandlers(fitnessAuditProxy);

/** /api/occupational-health/audit/oh-audit/{csv | history/{uuid}} (read-only). */
export const GET = handlers.GET;
