import type { CustomerVisitStatus } from "@/features/customers/types/customer-visit-status.types";
import type { Tag } from "@/features/tags/types/tag.types";

export type CustomerGender = "Male" | "Female" | "Other";

export type Customer = {
  id: number;
  uuid: string;
  tenant: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  customer_identifier: string;
  internal_reference: string;
  phone_number: string | null;
  email: string | null;
  patient_uuid: string;
  gender: CustomerGender | string;
  dob: string;
  dob_is_estimated: boolean;
  age: number;
  opening_balance?: number | string;
  has_synced_to_openmrs: boolean;
  is_active: boolean;
  visit_status: CustomerVisitStatus;
  last_visit_at?: string | null;
  active_visit_uuid?: string | null;
  photo_url?: string | null;
  current_queue_stage?: string | null;
  current_department_type?: string | null;
  tags?: Tag[];
  /** OH employment episode employer (when has_employment_episode list). */
  oh_employer_name?: string | null;
  /** OH employment episode risk profile (when has_employment_episode list). */
  oh_hazard_profile_name?: string | null;
  employment?: CustomerEmployment | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
};

export type CustomerEmployment = {
  uuid: string;
  category: "company" | "contractor";
  role: "employee" | "dependant";
  contractor_uuid: string | null;
  contractor_name: string | null;
  employee_number: string;
  related_employee_uuid: string | null;
  related_employee_name: string | null;
  related_employee_number: string | null;
  relationship: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerEmploymentWritePayload = {
  category: "company" | "contractor";
  role: "employee" | "dependant";
  contractor?: string | null;
  employee_number?: string;
  related_employee?: string | null;
  relationship?: string;
};

export type { CustomerVisitStatus };

export type CustomersPagination = {
  count: number;
  next: string | null;
  previous: string | null;
};

export type CustomersListResponse = {
  results: Customer[];
  pagination: CustomersPagination | null;
};

export type CustomerListFilters = {
  search?: string;
  page?: number;
  pageSize?: number;
  gender?: CustomerGender;
  isActive?: boolean;
  ordering?: string;
  tags?: string[];
  membershipNumber?: string;
  hasEmploymentEpisode?: boolean;
  employmentCategory?: "company" | "contractor";
  employmentRole?: "employee" | "dependant";
  contractor?: string;
};

export type CreateCustomerPayload = {
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: CustomerGender;
  dob?: string;
  dob_is_estimated?: boolean;
  phone_number?: string;
  email?: string;
  customer_identifier?: string;
  internal_reference?: string;
  employment?: CustomerEmploymentWritePayload | null;
};

export type UpdateCustomerPayload = CreateCustomerPayload;
