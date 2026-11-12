import { ohModuleRouteHandlers } from "@/lib/server/oh-module-bff";
import { wellbeingProxy } from "@/lib/server/wellbeing-bff";

const handlers = ohModuleRouteHandlers(wellbeingProxy);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
