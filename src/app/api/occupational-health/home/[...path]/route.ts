import { ohHomeProxy } from "@/lib/server/oh-home-bff";
import { ohModuleRouteHandlers } from "@/lib/server/oh-module-bff";

const handlers = ohModuleRouteHandlers(ohHomeProxy);

export const GET = handlers.GET;
