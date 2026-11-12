"use client";

import type { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContractorSearchSelect } from "@/features/customers/components/ContractorSearchSelect";
import { EmployeeSearchSelect } from "@/features/customers/components/EmployeeSearchSelect";
import {
  EmploymentCategoryChoice,
  type EmploymentCategory,
} from "@/features/customers/components/EmploymentCategoryChoice";
import {
  EmploymentRoleChoice,
  type EmploymentRole,
} from "@/features/customers/components/EmploymentRoleChoice";
import type { CustomerEmploymentFormValues } from "@/features/customers/schemas/customer-employment.schema";
import type { Customer } from "@/features/customers/types/customer.types";
import {
  CUSTOMER_RELATIONSHIP_LABELS,
  CUSTOMER_RELATIONSHIP_TYPES,
} from "@/features/customers/types/customer-relationship.types";
import type { OrganizationContractor } from "@/features/settings/types/settings.types";

type CustomerEmploymentFieldsProps = {
  form: UseFormReturn<CustomerEmploymentFormValues>;
  contractor: OrganizationContractor | null;
  relatedEmployee: Customer | null;
  onContractorChange: (contractor: OrganizationContractor | null) => void;
  onRelatedEmployeeChange: (customer: Customer | null) => void;
  disabled?: boolean;
};

export function CustomerEmploymentFields({
  form,
  contractor,
  relatedEmployee,
  onContractorChange,
  onRelatedEmployeeChange,
  disabled = false,
}: CustomerEmploymentFieldsProps) {
  const category = form.watch("category");
  const role = form.watch("role");

  function handleCategoryChange(next: EmploymentCategory) {
    const previous = form.getValues("category");
    form.setValue("category", next, { shouldValidate: true });
    if (previous === next) {
      return;
    }
    form.setValue("role", null, { shouldValidate: false });
    form.setValue("contractor_uuid", null, { shouldValidate: false });
    form.setValue("employee_number", "", { shouldValidate: false });
    form.setValue("related_employee_uuid", null, { shouldValidate: false });
    form.setValue("relationship", null, { shouldValidate: false });
    onContractorChange(null);
    onRelatedEmployeeChange(null);
  }

  function handleRoleChange(next: EmploymentRole) {
    const previous = form.getValues("role");
    form.setValue("role", next, { shouldValidate: true });
    if (previous === next) {
      return;
    }
    form.setValue("employee_number", "", { shouldValidate: false });
    form.setValue("related_employee_uuid", null, { shouldValidate: false });
    form.setValue("relationship", null, { shouldValidate: false });
    onRelatedEmployeeChange(null);
  }

  return (
    <div className="space-y-6" data-testid="customer-employment-fields">
      <div className="space-y-2">
        <p className="text-sm font-medium text-brand-navy">
          Employment category
          <RequiredFieldMarker />
        </p>
        <EmploymentCategoryChoice
          value={category}
          onChange={handleCategoryChange}
          disabled={disabled}
        />
        {form.formState.errors.category?.message ? (
          <p className="text-sm text-red-600">
            {form.formState.errors.category.message}
          </p>
        ) : null}
      </div>

      {category ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-brand-navy">
            Registration type
            <RequiredFieldMarker />
          </p>
          <EmploymentRoleChoice
            value={role}
            onChange={handleRoleChange}
            disabled={disabled}
          />
          {form.formState.errors.role?.message ? (
            <p className="text-sm text-red-600">
              {form.formState.errors.role.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {category === "contractor" && role ? (
        <ContractorSearchSelect
          value={contractor}
          disabled={disabled}
          error={form.formState.errors.contractor_uuid?.message}
          onChange={(next) => {
            onContractorChange(next);
            form.setValue("contractor_uuid", next?.uuid ?? null, {
              shouldValidate: true,
            });
            form.setValue("related_employee_uuid", null, {
              shouldValidate: false,
            });
            onRelatedEmployeeChange(null);
          }}
        />
      ) : null}

      {role === "employee" ? (
        <FormField
          control={form.control}
          name="employee_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Employee number
                {category === "company" ? <RequiredFieldMarker /> : null}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="off"
                  disabled={disabled}
                  placeholder={
                    category === "contractor" ? "Optional" : undefined
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {role === "dependant" ? (
        <div className="space-y-4">
          <EmployeeSearchSelect
            value={relatedEmployee}
            category={category ?? "company"}
            contractorUuid={contractor?.uuid ?? null}
            disabled={disabled}
            error={form.formState.errors.related_employee_uuid?.message}
            onChange={(next) => {
              onRelatedEmployeeChange(next);
              form.setValue("related_employee_uuid", next?.uuid ?? null, {
                shouldValidate: true,
              });
            }}
          />

          <FormField
            control={form.control}
            name="relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Relationship
                  <RequiredFieldMarker />
                </FormLabel>
                <Select
                  value={field.value ?? undefined}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <FormControl>
                    <SelectTrigger data-testid="employment-relationship-select">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CUSTOMER_RELATIONSHIP_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {CUSTOMER_RELATIONSHIP_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : null}
    </div>
  );
}
