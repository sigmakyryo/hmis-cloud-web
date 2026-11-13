import { healthProgramsProxy } from "@/lib/server/health-programs-bff";
import { ohModuleRouteHandlers } from "@/lib/server/oh-module-bff";

const handlers = ohModuleRouteHandlers(healthProgramsProxy);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
