import { describe, expect, it } from "vitest";

import {
  customerEmploymentDefaultValues,
  customerEmploymentFormSchema,
  toCustomerEmploymentWritePayload,
} from "@/features/customers/schemas/customer-employment.schema";

describe("customerEmploymentFormSchema", () => {
  it("requires employee number for company employees", () => {
    const result = customerEmploymentFormSchema.safeParse({
      ...customerEmploymentDefaultValues,
      category: "company",
      role: "employee",
      employee_number: "",
    });
    expect(result.success).toBe(false);
  });

  it("allows optional employee number for contractor employees", () => {
    const contractorUuid = "11111111-1111-1111-1111-111111111111";
    const result = customerEmploymentFormSchema.safeParse({
      ...customerEmploymentDefaultValues,
      category: "contractor",
      role: "employee",
      contractor_uuid: contractorUuid,
      employee_number: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(toCustomerEmploymentWritePayload(result.data)).toEqual({
        category: "contractor",
        role: "employee",
        contractor: contractorUuid,
        employee_number: "",
        related_employee: null,
        relationship: "",
      });
    }
  });

  it("requires related employee and relationship for dependants", () => {
    const result = customerEmploymentFormSchema.safeParse({
      ...customerEmploymentDefaultValues,
      category: "company",
      role: "dependant",
      related_employee_uuid: null,
      relationship: null,
    });
    expect(result.success).toBe(false);
  });

  it("maps dependant payload correctly", () => {
    const relatedUuid = "22222222-2222-2222-2222-222222222222";
    const result = customerEmploymentFormSchema.safeParse({
      ...customerEmploymentDefaultValues,
      category: "company",
      role: "dependant",
      related_employee_uuid: relatedUuid,
      relationship: "CHILD",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(toCustomerEmploymentWritePayload(result.data)).toEqual({
        category: "company",
        role: "dependant",
        contractor: null,
        employee_number: "",
        related_employee: relatedUuid,
        relationship: "CHILD",
      });
    }
  });
});
