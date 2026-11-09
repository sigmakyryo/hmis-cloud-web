"use client";

import Link from "next/link";
import { FileWarning } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import { DefinedOccupationalForms } from "@/features/occupational-health/components/DefinedOccupationalForms";
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
import { customerDetailTabHref } from "@/features/customers/utils/customer-detail-tabs";
import { ROUTES } from "@/constants/routes";

const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  uploaded: "Uploaded",
} as const;

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
  const form = (responses.data ?? []).find((row) => row.customer_uuid === customerUuid && row.is_active !== false) ?? null;
  const setup = useQuery({
    queryKey: ["oh-employee-form-setup", employerId, hazardProfileId],
    queryFn: () => loadEmployeeFormSetup(employerId, hazardProfileId),
    enabled: responses.isSuccess && !form && Boolean(employerId),
  });
  const [link, setLink] = useState<string | null>(null);
  const [answers, setAnswers] = useState<ExamTemplateAnswers | null>(null);
  const snapshot = parseExamTemplateSnapshot(form?.template_snapshot ?? null);
  const envelope = form?.responses_json?.__employee_form__ as { answers?: ExamTemplateAnswers } | undefined;
  const currentAnswers = answers ?? envelope?.answers ?? { picks: {}, fields: {} };
  const status = form?.status ?? "not_started";
  const locked = status === "submitted" || status === "uploaded";

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
    onSuccess: () => void refresh(),
  });
  const invite = useMutation({
    mutationFn: () => createOhEmployeeFormInvite(form!.uuid),
    onSuccess: (result) => setLink(`${window.location.origin}${ROUTES.workforceForm(result.token)}`),
  });
  const upload = useMutation({
    mutationFn: (file: File) => uploadOhEmployeeFormDocument(form!.uuid, file),
    onSuccess: () => void refresh(),
  });

  if (responses.isLoading || (!form && setup.isLoading)) {
    return <p className="text-sm text-dash-muted">Checking the employee form…</p>;
  }

  if (!form) {
    if (setup.data?.published && setup.data.templateUuid && !open.isError) {
      return (
        <div className="space-y-4" data-testid="oh-employee-forms-tab">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-brand-navy">
              Employee form status: <span data-testid="oh-employee-form-status">{STATUS_LABEL.not_started}</span>
            </p>
            <PrimaryButton type="button" onClick={() => open.mutate()} disabled={open.isPending}>
              {open.isPending ? "Opening…" : "Open form"}
            </PrimaryButton>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <EmployeeFormSetupState
          customerUuid={customerUuid}
          employerUuid={employerUuid}
          employerName={employerName}
          hasEmployment={Boolean(employerId)}
          hasRiskProfile={Boolean(hazardProfileId)}
          setup={setup.data ?? null}
        />
        <DefinedOccupationalForms />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="oh-employee-forms-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-brand-navy">
          Employee form status: <span data-testid="oh-employee-form-status">{STATUS_LABEL[status]}</span>
        </p>
        {locked ? null : (
          <div className="flex flex-wrap gap-2">
            <SecondaryButton type="button" onClick={() => save.mutate(false)} disabled={save.isPending}>Save</SecondaryButton>
            <PrimaryButton type="button" onClick={() => save.mutate(true)} disabled={save.isPending}>Submit</PrimaryButton>
            <SecondaryButton type="button" onClick={() => invite.mutate()} disabled={invite.isPending}>Send link</SecondaryButton>
          </div>
        )}
      </div>
      {link ? <p className="break-all text-[13px] text-brand-primary" data-testid="oh-employee-form-link">{link}</p> : null}
      {locked ? null : (
        <label className="block text-[13px] text-brand-navy">
          Upload document
          <input
            className="mt-1 block text-[13px]"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            disabled={upload.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
            }}
          />
          {form.document_original_name ? <span className="mt-1 block text-dash-muted">{form.document_original_name}</span> : null}
        </label>
      )}
      {snapshot ? (
        <OhExamTemplateCaptureForm
          snapshot={snapshot}
          value={currentAnswers}
          disabled={locked}
          onChange={(next) => setAnswers(next)}
        />
      ) : null}
      <DefinedOccupationalForms />
    </div>
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
}: {
  customerUuid: string;
  employerUuid: string | null;
  employerName: string | null;
  hasEmployment: boolean;
  hasRiskProfile: boolean;
  setup: EmployeeFormSetup | null;
}) {
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

  if (hasEmployment && setup && !setup.employerHasProfiles) {
    notices.push({
      title: "This employer has no risk profiles",
      description: `${employerLabel} has no risk profiles in settings. Create one and attach a published employee form.`,
      href: createProfileHref,
      action: "Add a risk profile",
      testId: "oh-employer-risk-profile-empty",
    });
  } else if (hasRiskProfile && setup?.profileUuid && !setup.templateUuid) {
    notices.push({
      title: "Employee form is not ready",
      description: `${setup.profileName ?? "This risk profile"} does not have an employee form yet. Attach and publish one before this can be filled.`,
      href: employerUuid
        ? `${ROUTES.settingsOccupationalHealthEmployer(employerUuid, "risk-profiles")}&profile=${setup.profileUuid}`
        : createProfileHref,
      action: "Set up the risk profile",
      testId: "oh-employee-form-setup-empty",
    });
  } else if (hasRiskProfile && setup?.templateUuid && !setup.published) {
    notices.push({
      title: "Employee form is not published",
      description: `${setup.profileName ?? "This risk profile"} has an employee form that still needs to be published.`,
      href: ROUTES.ohTemplateBuilder("employee", setup.templateUuid),
      action: "Open the employee form",
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
