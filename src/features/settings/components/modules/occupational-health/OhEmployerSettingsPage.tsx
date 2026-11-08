"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Archive01Icon, ArrowLeft01Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { ROUTES } from "@/constants/routes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { OhDepartmentsSettingsTab } from "@/features/settings/components/modules/occupational-health/OhDepartmentsSettingsTab";
import { OhHazardProfilesSettingsTab } from "@/features/settings/components/modules/occupational-health/OhHazardProfilesSettingsTab";
import { OhJobTitlesSettingsTab } from "@/features/settings/components/modules/occupational-health/OhJobTitlesSettingsTab";
import { SettingsContentSkeleton } from "@/features/settings/components/SettingsContentSkeleton";
import { SettingsUnderlineTabs } from "@/features/settings/components/SettingsPageLayout";
import {
  archiveOhEmployer,
  fetchOhEmployer,
  updateOhEmployer,
} from "@/features/occupational-health/services/oh.service";
import { BffError } from "@/lib/bff-client";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

export type OhEmployerSectionId = "risk-profiles" | "departments" | "job-titles";

const EMPLOYER_SECTIONS: Array<{ id: OhEmployerSectionId; label: string }> = [
  { id: "risk-profiles", label: "Risk profiles" },
  { id: "departments", label: "Departments" },
  { id: "job-titles", label: "Job titles" },
];

const EMPLOYER_PATH_PREFIX = `${ROUTES.settingsModuleOccupationalHealth}/employers/`;

export function occupationalHealthEmployerUuidFromPath(pathname: string): string | null {
  if (!pathname.startsWith(EMPLOYER_PATH_PREFIX)) {
    return null;
  }
  const uuid = pathname.slice(EMPLOYER_PATH_PREFIX.length).split("/")[0] ?? "";
  return uuid || null;
}

export function parseOhEmployerSection(value: string | null): OhEmployerSectionId {
  if (value === "departments" || value === "job-titles") {
    return value;
  }
  return "risk-profiles";
}

type OhEmployerSettingsPageProps = {
  employerUuid: string;
};

export function OhEmployerSettingsPage({ employerUuid }: OhEmployerSettingsPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const section = parseOhEmployerSection(searchParams.get("section"));
  const employerQuery = useQuery({
    queryKey: ["oh-employers", "detail", employerUuid],
    queryFn: () => fetchOhEmployer(employerUuid),
  });
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  function replaceParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function leaveEmployer() {
    router.push(ROUTES.settingsModuleOccupationalHealth);
  }

  function setSection(next: OhEmployerSectionId) {
    replaceParams((params) => {
      if (next === "risk-profiles") {
        params.delete("section");
        return;
      }
      params.set("section", next);
    });
  }

  const employer = employerQuery.data;

  function openEdit() {
    if (!employer) {
      return;
    }
    setName(employer.name);
    setCode(employer.code ?? "");
    setRegistrationNumber(employer.registration_number ?? "");
    setEditOpen(true);
  }

  async function handleSaveEmployer(event: FormEvent) {
    event.preventDefault();
    if (!employer || !name.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await updateOhEmployer(employer.uuid, {
        name: name.trim(),
        code: code.trim(),
        registration_number: registrationNumber.trim(),
      });
      queryClient.setQueryData(["oh-employers", "detail", updated.uuid], updated);
      void queryClient.invalidateQueries({ queryKey: ["oh-employers", "settings-directory"] });
      setEditOpen(false);
      toast({ variant: "success", title: "Employer updated" });
    } catch (submitError) {
      toast({
        variant: "error",
        title: "Could not update employer",
        description:
          submitError instanceof BffError
            ? submitError.message
            : submitError instanceof Error
              ? submitError.message
              : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!employer) {
      return;
    }
    setIsArchiving(true);
    try {
      await archiveOhEmployer(employer.uuid);
      void queryClient.invalidateQueries({ queryKey: ["oh-employers", "settings-directory"] });
      leaveEmployer();
      toast({
        variant: "success",
        title: "Employer archived",
        description: `${employer.name} was removed from the catalog.`,
      });
    } catch (archiveError) {
      toast({
        variant: "error",
        title: "Could not archive employer",
        description:
          archiveError instanceof Error
            ? archiveError.message
            : "Something went wrong.",
      });
    } finally {
      setIsArchiving(false);
    }
  }

  if (employerQuery.isPending) {
    return <SettingsContentSkeleton />;
  }

  if (employerQuery.isError || !employer) {
    return (
      <section className="space-y-3" data-testid="oh-employer-settings-missing">
        <p className="text-sm font-medium text-brand-navy">This employer could not be opened.</p>
        <Button type="button" variant="outline" onClick={leaveEmployer}>
          Back to employers
        </Button>
      </section>
    );
  }

  const meta = [employer.code, employer.registration_number].filter(Boolean).join(" · ");

  return (
    <section className="space-y-6" data-testid="oh-employer-settings-page">
      <header className="flex flex-col gap-4 border-b border-dash-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <button
            type="button"
            onClick={leaveEmployer}
            aria-label="Back to employers"
            className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-brand-navy hover:bg-slate-100"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.8} />
          </button>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="truncate text-[16px] font-semibold tracking-tight text-brand-navy">
                {employer.name}
              </h2>
              <Badge
                variant={employer.is_active === false ? "outline" : "success"}
                className="shrink-0"
              >
                {employer.is_active === false ? "Inactive" : "Active"}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-[13px] text-dash-muted">
              {meta || "Risk profiles, departments and job titles."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-primary hover:underline"
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={15} strokeWidth={1.8} />
            Edit
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[13px] text-red-700 hover:underline disabled:opacity-50"
            disabled={isArchiving}
            onClick={() => void handleArchive()}
          >
            {isArchiving ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <HugeiconsIcon icon={Archive01Icon} size={15} strokeWidth={1.8} />
            )}
            {isArchiving ? "Archiving" : "Archive"}
          </button>
        </div>
      </header>

      <SettingsUnderlineTabs
        tabs={EMPLOYER_SECTIONS}
        activeTab={section}
        onChange={setSection}
        ariaLabel="Employer catalog"
      />

      <div>
        <OhHazardProfilesSettingsTab
          isActive={section === "risk-profiles"}
          employer={employer}
          embedded
        />
        <OhDepartmentsSettingsTab
          isActive={section === "departments"}
          employer={employer}
          embedded
        />
        <OhJobTitlesSettingsTab
          isActive={section === "job-titles"}
          employer={employer}
          embedded
        />
      </div>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent
          className={cn(
            appFont.className,
            "flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
          )}
        >
          <SheetHeader className="space-y-0 px-5 pb-4 pr-12 pt-5 text-left">
            <SheetTitle>Edit employer</SheetTitle>
          </SheetHeader>
          <form
            className="space-y-4 border-t border-dash-border px-5 py-4"
            onSubmit={(event) => void handleSaveEmployer(event)}
          >
            <div className="space-y-1.5">
              <Label htmlFor="oh-employer-edit-name">
                Name <RequiredFieldMarker />
              </Label>
              <Input
                id="oh-employer-edit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oh-employer-edit-code">Code</Label>
              <Input
                id="oh-employer-edit-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oh-employer-edit-reg">Registration number</Label>
              <Input
                id="oh-employer-edit-reg"
                value={registrationNumber}
                onChange={(event) => setRegistrationNumber(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-dash-border pt-3">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <PrimaryButton type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? "Saving" : "Save changes"}
              </PrimaryButton>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}
