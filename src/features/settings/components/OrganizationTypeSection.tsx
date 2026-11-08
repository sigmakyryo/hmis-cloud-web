"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrganizationType } from "@/features/settings/services/settings.service";
import type { TenantDetail } from "@/features/settings/types/settings.types";
import {
  formatOrganizationTypeLabel,
  normalizeOrganizationType,
  type OrganizationType,
} from "@/features/settings/utils/organization-type";
import { useToast } from "@/providers/toast-provider";
import { useUser } from "@/providers/user-provider";

type OrganizationTypeSectionProps = {
  tenant: TenantDetail;
  onTenantUpdated: (tenant: TenantDetail) => void;
};

export function OrganizationTypeSection({
  tenant,
  onTenantUpdated,
}: OrganizationTypeSectionProps) {
  const { toast } = useToast();
  const { refreshUser } = useUser();
  const currentType = normalizeOrganizationType(tenant.organization_type);
  const [selectedType, setSelectedType] = useState<OrganizationType>(currentType);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedType(currentType);
  }, [currentType]);

  const isDirty = selectedType !== currentType;

  async function handleSave() {
    if (!isDirty) {
      return;
    }
    setIsSaving(true);
    try {
      const organizationType = await updateOrganizationType(selectedType);
      onTenantUpdated({ ...tenant, organization_type: organizationType });
      await refreshUser();
      toast({
        variant: "success",
        title: "Organization type updated",
        description: `${formatOrganizationTypeLabel(organizationType)} is now selected.`,
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not update organization type",
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={selectedType}
        onValueChange={(value) =>
          setSelectedType(normalizeOrganizationType(value))
        }
        disabled={isSaving}
      >
        <SelectTrigger
          className="h-8 w-[11.5rem] text-sm"
          data-testid="organization-type-select"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="public">Public-facing</SelectItem>
          <SelectItem value="employee">Employee-based</SelectItem>
        </SelectContent>
      </Select>
      {isDirty ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-brand-muted hover:text-brand-navy"
          onClick={() => void handleSave()}
          disabled={isSaving}
          data-testid="update-organization-type-button"
        >
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
        </Button>
      ) : null}
    </div>
  );
}
