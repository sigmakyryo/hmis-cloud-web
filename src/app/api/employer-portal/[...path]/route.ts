import { employerPortalProxy } from "@/lib/server/employer-portal-bff";
import { ohModuleRouteHandlers } from "@/lib/server/oh-module-bff";

const handlers = ohModuleRouteHandlers(employerPortalProxy);

export const GET = handlers.GET;
export const POST = handlers.POST;
