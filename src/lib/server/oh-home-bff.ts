import { createOhModuleProxy } from "@/lib/server/oh-module-bff";

/** OH home sections (`oh-home/{module}` on the OH service). Read only. */
export const ohHomeProxy = createOhModuleProxy({
  base: "/oh-home",
  queryKeys: [],
  rules: {
    GET: ["clinic", "immunizations", "drug-alcohol", "fitness", "health-programs", "exposure-management"],
  },
});
