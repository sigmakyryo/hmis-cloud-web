import { employerPortalAdminProxy } from "@/lib/server/employer-portal-bff";
import { ohModuleRouteHandlers } from "@/lib/server/oh-module-bff";

const handlers = ohModuleRouteHandlers(employerPortalAdminProxy);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
