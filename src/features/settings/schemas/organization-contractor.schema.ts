import { z } from "zod";

const contractorCodePattern = /^[A-Z0-9_-]*$/;

export const createOrganizationContractorSchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => contractorCodePattern.test(value), {
      message: "Use uppercase letters, numbers, underscores, or hyphens",
    }),
  contact_person: z.string().trim().optional(),
  phone_number: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      "Enter a valid email address",
    ),
  address: z.string().trim().optional(),
});

export type CreateOrganizationContractorFormValues = z.infer<
  typeof createOrganizationContractorSchema
>;

export const createOrganizationContractorDefaultValues: CreateOrganizationContractorFormValues =
  {
    name: "",
    code: "",
    contact_person: "",
    phone_number: "",
    email: "",
    address: "",
  };

export function toCreateOrganizationContractorPayload(
  values: CreateOrganizationContractorFormValues,
) {
  return {
    name: values.name.trim(),
    code: values.code.trim().toUpperCase(),
    contact_person: values.contact_person?.trim() || "",
    phone_number: values.phone_number?.trim() || "",
    email: values.email?.trim() || "",
    address: values.address?.trim() || "",
    is_active: true,
  };
}

export const updateOrganizationContractorSchema =
  createOrganizationContractorSchema.extend({
    is_active: z.boolean(),
  });

export type UpdateOrganizationContractorFormValues = z.infer<
  typeof updateOrganizationContractorSchema
>;

export function toUpdateOrganizationContractorFormValues(contractor: {
  name: string;
  code: string;
  contact_person?: string | null;
  phone_number?: string | null;
  email?: string | null;
  address?: string | null;
  is_active: boolean;
}): UpdateOrganizationContractorFormValues {
  return {
    name: contractor.name,
    code: contractor.code,
    contact_person: contractor.contact_person ?? "",
    phone_number: contractor.phone_number ?? "",
    email: contractor.email ?? "",
    address: contractor.address ?? "",
    is_active: contractor.is_active,
  };
}

export function toUpdateOrganizationContractorPayload(
  values: UpdateOrganizationContractorFormValues,
) {
  return {
    ...toCreateOrganizationContractorPayload(values),
    is_active: values.is_active,
  };
}
