import type { CustomerEmployment } from "@/features/customers/types/customer.types";

export type EmploymentDisplaySource = {
  employment?: CustomerEmployment | null;
  internal_reference?: string | null;
  /** Fallback when company employment has no contractor. */
  organizationName?: string | null;
};

export function formatEmploymentRoleLabel(
  role: string | null | undefined,
): string | null {
  if (role === "employee") return "Employee";
  if (role === "dependant") return "Dependant";
  return null;
}

export function resolveEmploymentEmployerName(
  source: EmploymentDisplaySource,
): string | null {
  const employment = source.employment;
  if (!employment || employment.is_active === false) {
    return null;
  }
  if (employment.category === "contractor") {
    return employment.contractor_name?.trim() || null;
  }
  return source.organizationName?.trim() || null;
}

export function resolveEmploymentEmployeeNumber(
  source: EmploymentDisplaySource,
): string | null {
  const employment = source.employment;
  if (employment?.role === "dependant") {
    return (
      employment.related_employee_number?.trim() ||
      source.internal_reference?.trim() ||
      null
    );
  }
  return (
    employment?.employee_number?.trim() ||
    source.internal_reference?.trim() ||
    null
  );
}

/** Employer · employee number for Client column sublines. */
export function formatEmploymentClientMeta(
  source: EmploymentDisplaySource,
): string | null {
  const employer = resolveEmploymentEmployerName(source);
  const employeeNumber = resolveEmploymentEmployeeNumber(source);
  const parts = [employer, employeeNumber].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
