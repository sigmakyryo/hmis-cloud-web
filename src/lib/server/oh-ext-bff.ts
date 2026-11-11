import { createOhModuleProxy } from "@/lib/server/oh-module-bff";

/**
 * Allowlisted proxy for the OH capabilities added after the module BFFs:
 * surveillance recalls, certificate/IOD/sick-leave documents, integrations,
 * data-subject requests, retention, audit and annual reports.
 * Paths are relative to the OHS API root.
 */
export const ohExtProxy = createOhModuleProxy({
  base: "",
  rules: {
    GET: ["oh/surveillance/recalls"],
    POST: ["oh/surveillance/recalls/run", "oh/surveillance/recalls/{id}/acknowledge"],
  },
  queryKeys: ["status", "stage", "channel", "customer_uuid", "open_only", "limit"],
});
