import { ohAnnualReportProxy } from "@/lib/server/oh-annual-report-bff";
import { ohModuleRouteHandlers } from "@/lib/server/oh-module-bff";

const handlers = ohModuleRouteHandlers(ohAnnualReportProxy);

export const GET = handlers.GET;
