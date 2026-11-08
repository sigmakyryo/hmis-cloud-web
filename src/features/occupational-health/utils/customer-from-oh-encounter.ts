import type { Customer } from "@/features/customers/types/customer.types";
import type { OhVisitEncounter } from "@/features/occupational-health/types";

export function customerFromOhEncounter(
  encounter: OhVisitEncounter,
): Customer | null {
  if (!encounter.customer_uuid) {
    return null;
  }

  const fullName =
    encounter.customer_name?.trim() ||
    [encounter.first_name, encounter.middle_name, encounter.last_name]
      .filter(Boolean)
      .join(" ");

  return {
    id: encounter.customer_id ?? 0,
    uuid: encounter.customer_uuid,
    tenant: 0,
    first_name: encounter.first_name ?? "",
    middle_name: encounter.middle_name ?? "",
    last_name: encounter.last_name ?? "",
    full_name: fullName,
    customer_identifier: encounter.customer_identifier ?? "",
    internal_reference: "",
    phone_number: encounter.phone_number ?? null,
    email: encounter.email ?? null,
    patient_uuid: encounter.customer_uuid,
    gender: encounter.gender ?? "",
    dob: encounter.dob ?? "",
    dob_is_estimated: false,
    age: 0,
    has_synced_to_openmrs: false,
    is_active: true,
    visit_status: "not_started",
    created_at: encounter.created_at,
    updated_at: encounter.updated_at,
    created_by: null,
  };
}
