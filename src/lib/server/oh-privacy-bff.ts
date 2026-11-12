import { createOhModuleProxy } from "@/lib/server/oh-module-bff";

/** DPA 2024 consent and data-subject requests (OHS /oh-privacy, see PRIVACY.md in the OH service). */
export const ohPrivacyProxy = createOhModuleProxy({
  base: "/oh-privacy",
  rules: {
    GET: ["consents/{id}", "requests", "requests/{id}/export", "retention"],
    POST: [
      "consents/{id}",
      "consent/{id}/withdraw",
      "requests",
      "requests/{id}/decide",
      "requests/{id}/anonymise",
      "requests/{id}/close",
    ],
    PATCH: [
      "retention/oh_visits",
      "retention/employment_episodes",
      "retention/portal_requests",
      "retention/immunisation_reminders",
      "retention/surveillance_recalls",
    ],
  },
  queryKeys: ["status", "customer_uuid"],
  created: ["consents/{id}", "requests"],
});
