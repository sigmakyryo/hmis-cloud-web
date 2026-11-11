import { ohExtProxy } from "@/lib/server/oh-ext-bff";
import { ohModuleRouteHandlers } from "@/lib/server/oh-module-bff";

const handlers = ohModuleRouteHandlers(ohExtProxy);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
