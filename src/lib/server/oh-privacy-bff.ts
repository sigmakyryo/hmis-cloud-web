import { createOhModuleProxy } from "@/lib/server/oh-module-bff";

/** DPA 2024 consent and data-subject requests (OHS /oh-privacy, see PRIVACY.md in the OH service). */
export const ohPrivacyProxy = createOhModuleProxy({
  base: "/oh-privacy",
  rules: {
    GET: ["consents/{id}", "requests", "requests/{id}/export"],
    POST: [
      "consents/{id}",
      "consent/{id}/withdraw",
      "requests",
      "requests/{id}/decide",
      "requests/{id}/anonymise",
      "requests/{id}/close",
    ],
  },
  queryKeys: ["status", "customer_uuid"],
  created: ["consents/{id}", "requests"],
});
