import { ohModuleRouteHandlers } from "@/lib/server/oh-module-bff";
import { ohPrivacyProxy } from "@/lib/server/oh-privacy-bff";

const handlers = ohModuleRouteHandlers(ohPrivacyProxy);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
