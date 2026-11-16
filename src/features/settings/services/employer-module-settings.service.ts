import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

export type EmployerModuleSettings = {
  pays_bills: boolean;
};

export async function fetchEmployerModuleSettings() {
  return bffRequest<EmployerModuleSettings>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.employerModuleSettings,
  );
}

export async function updateEmployerModuleSettings(paysBills: boolean) {
  return bffRequest<EmployerModuleSettings>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.employerModuleSettings,
    { method: "PUT", body: { pays_bills: paysBills } },
  );
}
