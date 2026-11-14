"use client";

import Link from "next/link";
import { FileWarning } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ListPageDataTable,
  ListPageDataTableBody,
  ListPageDataTableCell,
  ListPageDataTableHeader,
  ListPageDataTableHeaderCell,
  ListPageDataTableHeaderRow,
  ListPageDataTableRow,
} from "@/features/app-shell/components/page-layout";
import { OhEmployeeSessionRows } from "@/features/occupational-health/components/OhEmployeeSessionRows";
import { OhExamTemplateCaptureForm } from "@/features/occupational-health/components/OhExamTemplateCaptureForm";
import { parseExamTemplateSnapshot, type ExamTemplateAnswers } from "@/features/occupational-health/lib/exam-template-snapshot";
import {
  createOhEmployeeFormInvite,
  fetchOhEmployeeFormResponses,
  fetchOhEmployeeFormTemplates,
  fetchOhHazardProfiles,
  openOhEmployeeForm,
  patchOhEmployeeFormResponses,
  uploadOhEmployeeFormDocument,
} from "@/features/occupational-health/services/oh.service";
import type { OhTemplateCapture } from "@/features/occupational-health/types";
import { customerDetailTabHref } from "@/features/customers/utils/customer-detail-tabs";
import { employeeFormExportUrl } from "@/features/occupational-health/services/oh-ext.service";
import { ROUTES } from "@/constants/routes";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  uploaded: "Uploaded",
} as const;

type FormStatus = keyof typeof STATUS_LABEL;
type SheetMode = "actions" | "manual" | "view";

type OhEmployeeFormsTabProps = {
  customerUuid: string;
  employerId?: number | null;
  employerUuid?: string | null;
  employerName?: string | null;
  hazardProfileId?: number | null;
};

export function OhEmployeeFormsTab({
  customerUuid,
  employerId = null,
  employerUuid = null,
  employerName = null,
  hazardProfileId = null,
}: OhEmployeeFormsTabProps) {
  const queryClient = useQueryClient();
  const responses = useQuery({
    queryKey: ["oh-employee-form-responses", customerUuid],
    queryFn: fetchOhEmployeeFormResponses,
  });
  const form = (responses.data ?? []).find((row) => row.customer_uuid === customerUuid && row.encounter == null && row.is_active !== false) ?? null;
  const setup = useQuery({
    queryKey: ["oh-employee-form-setup", employerId, hazardProfileId],
    queryFn: () => loadEmployeeFormSetup(employerId, hazardProfileId),
    enabled: responses.isSuccess && !form && Boolean(employerId),
  });
  const [viewed, setViewed] = useState<OhTemplateCapture | null>(null);
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const [answers, setAnswers] = useState<ExamTemplateAnswers | null>(null);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const displayForm = sheet === "view" ? viewed ?? form : form;
  const snapshot = parseExamTemplateSnapshot(displayForm?.template_snapshot ?? null);
  const envelope = displayForm?.responses_json?.__employee_form__ as { answers?: ExamTemplateAnswers } | undefined;
  const currentAnswers = answers ?? envelope?.answers ?? { picks: {}, fields: {} };
  const status: FormStatus = form?.status ?? "not_started";
  const filled = status === "submitted" || status === "uploaded";
  const readyToFill = Boolean(form) || Boolean(setup.data?.published && setup.data.templateUuid);

  const refresh = async () => {
    setAnswers(null);
    await queryClient.invalidateQueries({ queryKey: ["oh-employee-form-responses", customerUuid] });
  };
  const open = useMutation({ mutationFn: () => openOhEmployeeForm(customerUuid), onSuccess: () => void refresh() });
  const save = useMutation({
    mutationFn: (submit: boolean) => patchOhEmployeeFormResponses(form!.uuid, {
      row_version: form!.row_version ?? 1,
      submit,
      responses_json: { __employee_form__: { ...(envelope ?? {}), answers: currentAnswers } },
    }),
    onSuccess: async () => {
      await refresh();
      setSheet(null);
    },
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const record = form ?? await openOhEmployeeForm(customerUuid);
      return uploadOhEmployeeFormDocument(record.uuid, file);
    },
    onSuccess: async () => {
      await refresh();
      setSheet("view");
    },
  });
  const copyLink = useMutation({
    mutationFn: async () => {
      const record = form ?? await openOhEmployeeForm(customerUuid);
      const invite = await createOhEmployeeFormInvite(record.uuid);
      return `${window.location.origin}${ROUTES.workforceForm(invite.token)}`;
    },
    onSuccess: async (link) => {
      setPublicLink(link);
      try {
        await navigator.clipboard.writeText(link);
        setLinkCopied(true);
      } catch {
        setLinkCopied(false);
      }
      await refresh();
    },
  });

  function openSheet() {
    setViewed(null);
    setSheet(filled ? "view" : "actions");
  }

  async function enterManually() {
    if (!form) {
      await open.mutateAsync();
    }
    setSheet("manual");
  }

  if (responses.isLoading) {
    return <p className="text-sm text-dash-muted">Checking the employee form…</p>;
  }

  return (
    <div data-testid="oh-employee-forms-tab">
      <ListPageDataTable>
        <ListPageDataTableHeader>
          <ListPageDataTableHeaderRow>
            <ListPageDataTableHeaderCell>Record</ListPageDataTableHeaderCell>
            <ListPageDataTableHeaderCell>Date</ListPageDataTableHeaderCell>
            <ListPageDataTableHeaderCell>Status</ListPageDataTableHeaderCell>
            <ListPageDataTableHeaderCell>Result</ListPageDataTableHeaderCell>
            <ListPageDataTableHeaderCell>Updated</ListPageDataTableHeaderCell>
            <ListPageDataTableHeaderCell className="text-right">Actions</ListPageDataTableHeaderCell>
          </ListPageDataTableHeaderRow>
        </ListPageDataTableHeader>
        <ListPageDataTableBody>
          <ListPageDataTableRow data-testid="oh-employee-form-row">
            <ListPageDataTableCell>
              <p className="font-medium text-brand-navy">Employee form</p>
              <p className="text-[12px] text-dash-muted">
                {employerName ? `Employment record · ${employerName}` : "Kept on this employment record"}
              </p>
            </ListPageDataTableCell>
            <ListPageDataTableCell>{formatFormDate(form?.submitted_at ?? form?.created_at)}</ListPageDataTableCell>
            <ListPageDataTableCell>
              <span data-testid="oh-employee-form-status">{STATUS_LABEL[status]}</span>
            </ListPageDataTableCell>
            <ListPageDataTableCell>{resultLabel(form, status)}</ListPageDataTableCell>
            <ListPageDataTableCell>{formatFormDate(form?.updated_at)}</ListPageDataTableCell>
            <ListPageDataTableCell className="text-right">
              <button type="button" className="text-[13px] font-medium text-brand-primary" onClick={openSheet}>
                {filled ? "View" : "Fill"}
              </button>
            </ListPageDataTableCell>
          </ListPageDataTableRow>
          <OhEmployeeSessionRows customerUuid={customerUuid} employeeForms={responses.data ?? []} onViewEmployeeForm={(response) => {
            setViewed(response);
            setSheet("view");
          }} />
        </ListPageDataTableBody>
      </ListPageDataTable>

      <Sheet open={sheet !== null} onOpenChange={(openSheet) => { if (!openSheet) setSheet(null); }}>
        <SheetContent className={cn("flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl", appFont.className)}>
          <SheetHeader className="border-b border-dash-border px-5 py-5 pr-12 text-left">
            <SheetTitle className="text-base text-brand-navy">Employee form</SheetTitle>
            <SheetDescription>
              {sheet === "view"
                ? "What was recorded for this employee."
                : sheet === "manual"
                  ? "Enter the answers, then save or submit them."
                  : "Choose how this form gets completed."}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {sheet === "actions" ? (
              readyToFill ? (
                <div className="space-y-2">
                  <ActionChoice
                    title="Enter manually"
                    detail="Fill the questions here."
                    disabled={open.isPending}
                    onClick={() => void enterManually()}
                  />
                  <ActionChoice
                    title="Copy public link"
                    detail={linkCopied ? "Copied. The employee opens this page to fill the form." : "Copy the page the employee uses to fill this form."}
                    disabled={copyLink.isPending}
                    onClick={() => copyLink.mutate()}
                  />
                  {publicLink ? (
                    <p className="break-all px-1 text-[13px] text-brand-primary" data-testid="oh-employee-form-link">{publicLink}</p>
                  ) : null}
                  <UploadChoice pending={upload.isPending} onFile={(file) => upload.mutate(file)} />
                  {open.isError || upload.isError ? <p className="text-sm text-red-700">The employee form could not be opened.</p> : null}
                  {copyLink.isError ? <p className="text-sm text-red-700">The public link could not be created.</p> : null}
                </div>
              ) : (
                <EmployeeFormSetupState
                  customerUuid={customerUuid}
                  employerUuid={employerUuid}
                  employerName={employerName}
                  hasEmployment={Boolean(employerId)}
                  hasRiskProfile={Boolean(hazardProfileId)}
                  setup={employerId ? setup.data ?? null : {
                    profileName: null,
                    profileUuid: null,
                    templateUuid: null,
                    published: false,
                    employerHasProfiles: false,
                  }}
                  checking={Boolean(employerId) && setup.isLoading}
                />
              )
            ) : null}
            {sheet === "manual" || sheet === "view" ? (
              <div className="space-y-4">
                {displayForm?.document_original_name ? (
                  <p className="text-[13px] text-brand-navy">Uploaded file: {displayForm.document_original_name}</p>
                ) : null}
                {sheet === "view" && displayForm && (displayForm.status === "submitted" || displayForm.status === "uploaded") ? (
                  <SecondaryButton asChild>
                    <a href={employeeFormExportUrl(displayForm.uuid)} target="_blank" rel="noreferrer">
                      {displayForm.status === "uploaded" ? "Download document" : "Open PDF to print or save"}
                    </a>
                  </SecondaryButton>
                ) : null}
                {snapshot ? (
                  <OhExamTemplateCaptureForm
                    snapshot={snapshot}
                    value={sheet === "view" ? envelope?.answers ?? { picks: {}, fields: {} } : currentAnswers}
                    disabled={sheet === "view" || save.isPending}
                    onChange={(next) => setAnswers(next)}
                  />
                ) : (
                  <p className="text-[13px] text-dash-muted">
                    {sheet === "view" ? "Nothing has been entered on this form yet." : "This form has no questions to fill yet."}
                  </p>
                )}
                {save.isError ? <p className="text-sm text-red-700">The answers could not be saved.</p> : null}
              </div>
            ) : null}
          </div>
          {sheet === "manual" ? (
            <div className="flex justify-end gap-2 border-t border-dash-border px-5 py-4">
              <SecondaryButton type="button" onClick={() => setSheet("actions")}>Back</SecondaryButton>
              <SecondaryButton type="button" onClick={() => save.mutate(false)} disabled={!form || save.isPending}>Save</SecondaryButton>
              <PrimaryButton type="button" onClick={() => save.mutate(true)} disabled={!form || save.isPending}>Submit</PrimaryButton>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function formatFormDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function resultLabel(form: OhTemplateCapture | null, status: FormStatus) {
  if (form?.document_original_name) {
    return form.document_original_name;
  }
  if (status === "submitted") {
    return "Answers recorded";
  }
  if (status === "in_progress") {
    return "Draft";
  }
  return "Not filled";
}

function ActionChoice({
  title,
  detail,
  disabled = false,
  onClick,
}: {
  title: string;
  detail: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full flex-col rounded-xl border border-dash-border bg-white px-4 py-3 text-left transition-colors hover:bg-brand-tint/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white"
    >
      <span className="text-[13px] font-medium text-brand-navy">{title}</span>
      <span className="text-[12px] text-dash-muted">{detail}</span>
    </button>
  );
}

function UploadChoice({ pending, onFile }: { pending: boolean; onFile: (file: File) => void }) {
  return (
    <label className={cn("flex w-full cursor-pointer flex-col rounded-xl border border-dash-border bg-white px-4 py-3 text-left hover:bg-brand-tint/40", pending && "pointer-events-none opacity-60")}>
      <span className="text-[13px] font-medium text-brand-navy">Upload</span>
      <span className="text-[12px] text-dash-muted">Add a PDF or photo of the completed form.</span>
      <input
        className="sr-only"
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        disabled={pending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}

type EmployeeFormSetup = {
  profileName: string | null;
  profileUuid: string | null;
  templateUuid: string | null;
  published: boolean;
  employerHasProfiles: boolean;
};

async function loadEmployeeFormSetup(
  employerId: number | null,
  hazardProfileId: number | null,
): Promise<EmployeeFormSetup> {
  const empty = {
    profileName: null,
    profileUuid: null,
    templateUuid: null,
    published: false,
    employerHasProfiles: false,
  };
  if (!employerId) {
    return empty;
  }
  const profiles = await fetchOhHazardProfiles(employerId);
  const profile = hazardProfileId
    ? profiles.find((item) => item.id === hazardProfileId) ?? null
    : null;
  const templateUuid = profile?.employee_form_template ?? null;
  if (!templateUuid) {
    return {
      ...empty,
      profileName: profile?.name ?? null,
      profileUuid: profile?.uuid ?? null,
      employerHasProfiles: profiles.length > 0,
    };
  }
  const templates = await fetchOhEmployeeFormTemplates();
  const template = templates.find((item) => item.uuid === templateUuid) ?? null;
  return {
    profileName: profile?.name ?? null,
    profileUuid: profile?.uuid ?? null,
    templateUuid,
    published: template?.published_version_status === "published",
    employerHasProfiles: profiles.length > 0,
  };
}

function EmployeeFormSetupState({
  customerUuid,
  employerUuid,
  employerName,
  hasEmployment,
  hasRiskProfile,
  setup,
  checking,
}: {
  customerUuid: string;
  employerUuid: string | null;
  employerName: string | null;
  hasEmployment: boolean;
  hasRiskProfile: boolean;
  setup: EmployeeFormSetup | null;
  checking: boolean;
}) {
  if (checking) {
    return <p className="text-sm text-dash-muted">Checking the employee form…</p>;
  }
  if (!setup) {
    return (
      <EmptyState
        icon={FileWarning}
        title="Employee form is not ready"
        description="The risk profile needs a published employee form before this can be filled."
        data-testid="oh-employee-form-setup-empty"
      />
    );
  }

  const employerLabel = employerName?.trim() || "This employer";
  const employmentHref = `${customerDetailTabHref(customerUuid, "employment")}?sheet=${hasEmployment ? "edit" : "add"}`;
  const createProfileHref = employerUuid
    ? `${ROUTES.settingsOccupationalHealthEmployer(employerUuid, "risk-profiles")}&profile=new`
    : ROUTES.settingsModuleOccupationalHealth;
  const notices: Array<{ title: string; description: string; href: string; action: string; testId: string }> = [];

  if (!hasEmployment) {
    notices.push({
      title: "No employment record",
      description: "Add employment for this client before an employee form can be filled.",
      href: employmentHref,
      action: "Add employment",
      testId: "oh-employee-form-setup-empty",
    });
  } else if (!hasRiskProfile) {
    notices.push({
      title: "Employment has no risk profile",
      description: "Choose a risk profile on this employment record before an employee form can be filled.",
      href: employmentHref,
      action: "Assign a risk profile",
      testId: "oh-employee-form-setup-empty",
    });
  }

  if (hasEmployment && !setup.employerHasProfiles) {
    notices.push({
      title: "This employer has no risk profiles",
      description: `${employerLabel} has no risk profiles in settings. Create one and attach a published employee form.`,
      href: createProfileHref,
      action: "Add a risk profile",
      testId: "oh-employer-risk-profile-empty",
    });
  } else if (hasRiskProfile && setup.profileUuid && !setup.templateUuid) {
    notices.push({
      title: "Employee form is not ready",
      description: `${setup.profileName ?? "This risk profile"} does not have an employee form yet. Attach and publish one before this can be filled.`,
      href: employerUuid
        ? `${ROUTES.settingsOccupationalHealthEmployer(employerUuid, "risk-profiles")}&profile=${setup.profileUuid}`
        : createProfileHref,
      action: "Set up the risk profile",
      testId: "oh-employee-form-setup-empty",
    });
  } else if (hasRiskProfile && setup.templateUuid && !setup.published) {
    notices.push({
      title: "Employee form is not published",
      description: `${setup.profileName ?? "This risk profile"} has an employee form that still needs to be published.`,
      href: employerUuid
        ? `${ROUTES.settingsOccupationalHealthEmployer(employerUuid, "risk-profiles")}&profile=${setup.profileUuid}`
        : createProfileHref,
      action: "Set up the risk profile",
      testId: "oh-employee-form-setup-empty",
    });
  }

  if (notices.length === 0) {
    return (
      <EmptyState
        icon={FileWarning}
        title="Employee form is not ready"
        description="The risk profile needs a published employee form before this can be filled."
        data-testid="oh-employee-form-setup-empty"
      />
    );
  }

  return (
    <div className="space-y-4">
      {notices.map((notice) => (
        <EmptyState
          key={notice.testId + notice.action}
          icon={FileWarning}
          title={notice.title}
          description={notice.description}
          data-testid={notice.testId}
          action={
            <SecondaryButton asChild>
              <Link href={notice.href}>{notice.action}</Link>
            </SecondaryButton>
          }
        />
      ))}
    </div>
  );
}
