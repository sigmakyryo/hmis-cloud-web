"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";

import { AppIcon } from "@/components/icons/app-icon";
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ROUTES } from "@/constants/routes";
import { getActiveClinics } from "@/features/app-shell/utils/workspace-clinics";
import type { UserClinic } from "@/features/app-shell/utils/workspace-clinics";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useUser } from "@/providers/user-provider";
import { useWorkspaceStore } from "@/state/workspace.store";

export function TeamSwitcher() {
  const { userData, isLoading } = useUser();
  const [open, setOpen] = useState(false);
  const activeClinicId = useWorkspaceStore((state) => state.activeClinicId);
  const setActiveClinicId = useWorkspaceStore((state) => state.setActiveClinicId);

  const clinics = getActiveClinics(userData);
  const resolvedClinicId =
    activeClinicId && clinics.some((clinic) => clinic.clinic === activeClinicId)
      ? activeClinicId
      : (clinics.find((clinic) => clinic.is_primary)?.clinic ??
        clinics[0]?.clinic ??
        userData?.primary_clinic?.id ??
        null);

  const tenantName =
    userData?.tenant?.name ??
    userData?.primary_clinic?.tenant_name ??
    "Organization";

  const activeClinic =
    clinics.find((clinic) => clinic.clinic === resolvedClinicId) ??
    clinics.find((clinic) => clinic.is_primary) ??
    clinics[0];

  const activeClinicLabel =
    activeClinic?.clinic_name ?? userData?.primary_clinic?.name ?? "Clinic";

  function handleClinicSelect(clinic: UserClinic) {
    setActiveClinicId(clinic.clinic);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="sidebar-team-switcher-trigger"
          aria-label={`Switch workspace, ${activeClinicLabel}`}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none transition-colors hover:bg-dash-canvas focus-visible:ring-2 focus-visible:ring-brand-primary/25 data-[state=open]:bg-dash-canvas group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <WorkspaceAvatar
            name={activeClinicLabel}
            className="size-7 rounded-lg text-[11px]"
          />
          <span className="grid min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-[13px] font-semibold leading-tight text-brand-navy">
              {isLoading ? "Loading..." : activeClinicLabel}
            </span>
            <span className="truncate text-[11px] leading-tight text-dash-muted">
              {tenantName}
            </span>
          </span>
          <AppIcon
            name="chevronUpDown"
            size={14}
            className="shrink-0 text-dash-muted group-data-[collapsible=icon]:hidden"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-testid="sidebar-team-switcher-popover"
        side="right"
        align="start"
        sideOffset={10}
        className={cn(appFont.className, "w-64 rounded-lg p-1.5")}
      >
        {clinics.length > 0 ? (
          <ul className="space-y-0.5">
            {clinics.map((clinic) => {
              const isActive = clinic.clinic === resolvedClinicId;

              return (
                <li key={clinic.id}>
                  <button
                    type="button"
                    data-testid={`clinic-option-${clinic.clinic}`}
                    onClick={() => handleClinicSelect(clinic)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left outline-none hover:bg-brand-primary/5",
                      isActive && "bg-brand-primary/10",
                    )}
                  >
                    <WorkspaceAvatar
                      name={clinic.clinic_name}
                      className="size-7 rounded-lg text-[11px]"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[13px] font-medium",
                          isActive ? "text-brand-primary" : "text-brand-navy",
                        )}
                      >
                        {clinic.clinic_name}
                      </span>
                      <span className="block truncate text-[11px] text-dash-muted">
                        {clinic.is_primary ? "Primary" : clinic.role}
                      </span>
                    </span>
                    {isActive ? (
                      <Check className="size-4 shrink-0 text-brand-primary" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-2 py-1.5 text-sm text-dash-muted">No clinics assigned</p>
        )}
        <div className="mt-1">
          <Link
            href={ROUTES.settingsOrganization}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px] text-brand-navy outline-none hover:bg-brand-primary/5"
          >
            <AppIcon name="settings" size={16} className="text-dash-muted" />
            <span>Organization settings</span>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
