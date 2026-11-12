import { z } from "zod";

import { CUSTOMER_RELATIONSHIP_TYPES } from "@/features/customers/types/customer-relationship.types";
import type { CustomerEmploymentWritePayload } from "@/features/customers/types/customer.types";
import type { Customer } from "@/features/customers/types/customer.types";
import type { OrganizationContractor } from "@/features/settings/types/settings.types";

export const employmentCategorySchema = z.enum(["company", "contractor"]);
export const employmentRoleSchema = z.enum(["employee", "dependant"]);

export const customerEmploymentFormSchema = z
  .object({
    category: employmentCategorySchema.nullable(),
    role: employmentRoleSchema.nullable(),
    contractor_uuid: z.string().uuid().nullable(),
    employee_number: z.string().trim().max(255),
    related_employee_uuid: z.string().uuid().nullable(),
    relationship: z.enum(CUSTOMER_RELATIONSHIP_TYPES).nullable(),
  })
  .superRefine((values, ctx) => {
    if (!values.category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["category"],
        message: "Select an employment category.",
      });
      return;
    }
    if (!values.role) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["role"],
        message: "Select employee or dependant.",
      });
      return;
    }
    if (values.category === "contractor" && !values.contractor_uuid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contractor_uuid"],
        message: "Select a contractor.",
      });
    }
    if (values.role === "employee") {
      if (values.category === "company" && !values.employee_number.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["employee_number"],
          message: "Employee number is required.",
        });
      }
    } else {
      if (!values.related_employee_uuid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["related_employee_uuid"],
          message: "Select the related employee.",
        });
      }
      if (!values.relationship) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["relationship"],
          message: "Relationship is required.",
        });
      }
    }
  });

export type CustomerEmploymentFormValues = z.infer<
  typeof customerEmploymentFormSchema
>;

export const customerEmploymentDefaultValues: CustomerEmploymentFormValues = {
  category: null,
  role: null,
  contractor_uuid: null,
  employee_number: "",
  related_employee_uuid: null,
  relationship: null,
};

export type EmploymentSelectionState = {
  contractor: OrganizationContractor | null;
  relatedEmployee: Customer | null;
};

export function toCustomerEmploymentWritePayload(
  values: CustomerEmploymentFormValues,
): CustomerEmploymentWritePayload | null {
  if (!values.category || !values.role) {
    return null;
  }

  if (values.role === "employee") {
    return {
      category: values.category,
      role: "employee",
      contractor:
        values.category === "contractor" ? values.contractor_uuid : null,
      employee_number: values.employee_number.trim(),
      related_employee: null,
      relationship: "",
    };
  }

  return {
    category: values.category,
    role: "dependant",
    contractor:
      values.category === "contractor" ? values.contractor_uuid : null,
    employee_number: "",
    related_employee: values.related_employee_uuid,
    relationship: values.relationship ?? "",
  };
}
