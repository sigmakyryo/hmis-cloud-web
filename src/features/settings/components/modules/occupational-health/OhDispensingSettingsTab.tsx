"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchInventoryLocations } from "@/features/inventory/services/inventory.service";
import {
  fetchOhDispensingSettings,
  updateOhDispensingSettings,
} from "@/features/occupational-health/services/oh.service";
import { fetchOrganizationUsers } from "@/features/settings/services/user-management.service";
import { useToast } from "@/providers/toast-provider";

type OhDispensingSettingsTabProps = {
  isActive: boolean;
};

const NONE = "__none__";

type Draft = {
  enabled: boolean;
  dispenserUserId: string;
  locationId: string;
};

function draftFromSettings(data: {
  enabled: boolean;
  dispenser_user: number | null;
  location: number | null;
}): Draft {
  return {
    enabled: Boolean(data.enabled),
    dispenserUserId: data.dispenser_user != null ? String(data.dispenser_user) : NONE,
    locationId: data.location != null ? String(data.location) : NONE,
  };
}

export function OhDispensingSettingsTab({ isActive }: OhDispensingSettingsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["oh-dispensing-settings"],
    queryFn: fetchOhDispensingSettings,
    enabled: isActive,
  });
  const users = useQuery({
    queryKey: ["org-users-dispensing"],
    queryFn: () => fetchOrganizationUsers({ pageSize: 200 }),
    enabled: isActive,
  });
  const locations = useQuery({
    queryKey: ["inventory-locations-dispensing"],
    queryFn: () => fetchInventoryLocations(),
    enabled: isActive,
  });

  const baseline = useMemo(
    () => (settings.data ? draftFromSettings(settings.data) : null),
    [settings.data],
  );
  const [override, setOverride] = useState<Draft | null>(null);
  const draft = override ?? baseline ?? {
    enabled: false,
    dispenserUserId: NONE,
    locationId: NONE,
  };

  const dirty = Boolean(
    baseline &&
      (draft.enabled !== baseline.enabled ||
        draft.dispenserUserId !== baseline.dispenserUserId ||
        draft.locationId !== baseline.locationId),
  );

  const save = useMutation({
    mutationFn: () =>
      updateOhDispensingSettings({
        enabled: draft.enabled,
        dispenser_user: draft.dispenserUserId === NONE ? null : Number(draft.dispenserUserId),
        location: draft.locationId === NONE ? null : Number(draft.locationId),
      }),
    onSuccess: async () => {
      setOverride(null);
      await queryClient.invalidateQueries({ queryKey: ["oh-dispensing-settings"] });
      toast({ title: "Dispensing settings saved", variant: "success" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not save dispensing settings",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "error",
      });
    },
  });

  if (!isActive) {
    return null;
  }

  if (settings.isLoading) {
    return <p className="py-6 text-[13px] text-dash-muted">Loading dispensing settings…</p>;
  }

  if (settings.isError) {
    return (
      <p className="py-6 text-[13px] text-dash-muted">
        Could not load OH dispensing settings.
      </p>
    );
  }

  const userOptions = users.data?.results ?? [];
  const locationOptions = locations.data?.results ?? [];

  return (
    <div className="max-w-xl space-y-5 py-6" data-testid="oh-dispensing-settings-tab">
      <div>
        <h3 className="text-[14px] font-medium text-brand-navy">Stock auto-dispense</h3>
        <p className="mt-1 text-[13px] text-dash-muted">
          When enabled, billing a stockable vaccine on an OH visit also dispenses from the
          chosen store using the configured dispenser. Off by default. Billing still succeeds
          if stock fails.
        </p>
      </div>

      <label className="flex items-center gap-2 text-[13px] text-brand-navy">
        <input
          type="checkbox"
          checked={draft.enabled}
          onChange={(e) =>
            setOverride({ ...draft, enabled: e.target.checked })
          }
          className="h-4 w-4 rounded border-dash-border"
        />
        Enable auto-dispense for OH vaccine charges
      </label>

      <div className="space-y-2">
        <Label htmlFor="oh-dispense-user">Dispenser user</Label>
        <Select
          value={draft.dispenserUserId}
          onValueChange={(value) => setOverride({ ...draft, dispenserUserId: value })}
        >
          <SelectTrigger id="oh-dispense-user">
            <SelectValue placeholder="Select user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>None</SelectItem>
            {userOptions.map((user) => (
              <SelectItem key={user.id} value={String(user.id)}>
                {user.name || user.email || `User ${user.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="oh-dispense-location">Store / location</Label>
        <Select
          value={draft.locationId}
          onValueChange={(value) => setOverride({ ...draft, locationId: value })}
        >
          <SelectTrigger id="oh-dispense-location">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>None</SelectItem>
            {locationOptions.map((loc) => (
              <SelectItem key={loc.id} value={String(loc.id)}>
                {loc.name}
                {loc.clinic_name ? ` · ${loc.clinic_name}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <PrimaryButton
          type="button"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving…" : "Save"}
        </PrimaryButton>
        <SecondaryButton
          type="button"
          disabled={!dirty || save.isPending}
          onClick={() => setOverride(null)}
        >
          Reset
        </SecondaryButton>
      </div>
    </div>
  );
}
