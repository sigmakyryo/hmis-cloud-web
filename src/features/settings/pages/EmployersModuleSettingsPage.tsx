"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ROUTES } from "@/constants/routes";
import { OhEmployerSettingsPage } from "@/features/settings/components/modules/occupational-health/OhEmployerSettingsPage";
import { OhEmployersSettingsTab } from "@/features/settings/components/modules/occupational-health/OhEmployersSettingsTab";
import { SettingsContentSkeleton } from "@/features/settings/components/SettingsContentSkeleton";
import {
  SettingsPageLayout,
  SettingsSection,
} from "@/features/settings/components/SettingsPageLayout";
import {
  fetchEmployerModuleSettings,
  updateEmployerModuleSettings,
} from "@/features/settings/services/employer-module-settings.service";
import { getErrorMessage } from "@/lib/fetch-error";
import { useToast } from "@/providers/toast-provider";
import { useUser } from "@/providers/user-provider";

const SETTINGS_KEY = ["employer-module-settings"] as const;

function ClinicPaysBillsDefault() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: fetchEmployerModuleSettings,
  });
  const save = useMutation({
    mutationFn: updateEmployerModuleSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(SETTINGS_KEY, data);
    },
    onError: (error) => {
      toast({
        variant: "error",
        title: "Could not save the clinic default",
        description: getErrorMessage(error),
      });
    },
  });

  return (
    <div className="flex items-center justify-between gap-4 border-b border-dash-border py-4">
      <div>
        <Label htmlFor="employers-pay-bills-default" className="text-[13px] text-brand-navy">
          Employers pay bills
        </Label>
        <p className="mt-0.5 text-[13px] text-dash-muted">
          New companies start with this choice. Each company keeps its own rule after that.
        </p>
      </div>
      <Switch
        id="employers-pay-bills-default"
        checked={settings.data?.pays_bills === true}
        disabled={settings.isPending || save.isPending}
        onCheckedChange={(checked) => save.mutate(checked)}
        aria-label="Employers pay bills"
      />
    </div>
  );
}

function EmployersModuleSettingsBody() {
  const employerUuid = useSearchParams().get("employer");

  if (employerUuid) {
    return <OhEmployerSettingsPage employerUuid={employerUuid} />;
  }

  return (
    <>
      <ClinicPaysBillsDefault />
      <OhEmployersSettingsTab isActive />
    </>
  );
}

export function EmployersModuleSettingsPage() {
  const { userData, isLoading } = useUser();
  const isTenantAdmin = Boolean(userData?.is_admin);

  if (isLoading) {
    return <SettingsContentSkeleton />;
  }

  if (!isTenantAdmin) {
    return (
      <SettingsPageLayout
        title="Employers"
        description="Employer settings are available to tenant administrators."
      >
        <SettingsSection title="Access restricted">
          <div className="space-y-4">
            <p className="text-sm text-brand-muted">
              You need tenant administrator access to configure employers.
            </p>
            <Button asChild variant="outline">
              <Link href={ROUTES.settingsAccount}>Back to account settings</Link>
            </Button>
          </div>
        </SettingsSection>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout
      title="Employers"
      description="Companies this clinic works with, and whether a new company pays its bills."
      className="max-w-5xl"
    >
      <Suspense fallback={<SettingsContentSkeleton />}>
        <EmployersModuleSettingsBody />
      </Suspense>
    </SettingsPageLayout>
  );
}
