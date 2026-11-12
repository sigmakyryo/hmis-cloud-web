export type OrganizationType = "public" | "employee";

export type OrganizationTypeSource = {
  organization_type?: OrganizationType | string | null;
} | null | undefined;

export function normalizeOrganizationType(
  value: string | null | undefined,
): OrganizationType {
  return value === "employee" ? "employee" : "public";
}

export function isEmployeeBasedOrganization(
  tenant: OrganizationTypeSource,
): boolean {
  return normalizeOrganizationType(tenant?.organization_type) === "employee";
}

export function getInternalReferenceLabel(
  tenant: OrganizationTypeSource,
): string {
  return isEmployeeBasedOrganization(tenant)
    ? "Employee number"
    : "Internal reference";
}

export function getInternalReferenceShortLabel(
  tenant: OrganizationTypeSource,
): string {
  return isEmployeeBasedOrganization(tenant) ? "Employee Number" : "Reference";
}

export function formatOrganizationTypeLabel(
  value: string | null | undefined,
): string {
  return normalizeOrganizationType(value) === "employee"
    ? "Employee-based"
    : "Public-facing";
}
