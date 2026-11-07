"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, FileWarning } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { appFont } from "@/lib/fonts";
import { OhCorporateWorkspace } from "@/features/occupational-health/components/OhCorporateWorkspace";
import { PrimaryButton } from "@/components/ui/app-buttons";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MedicalExamStartType } from "@/features/occupational-health/components/OhExamTypeDialog";
import { OhExamTemplateCaptureForm } from "@/features/occupational-health/components/OhExamTemplateCaptureForm";
import { OhProcedureChecklistPanel } from "@/features/occupational-health/components/OhProcedureChecklistPanel";
import type { useOhEncounterWorkspaceData } from "@/features/occupational-health/hooks/use-occupational-health";
import {
  emptyExamTemplateAnswers,
  parseExamTemplateSnapshot,
  type ExamTemplateAnswers,
  type ExamTemplateResponseEnvelope,
} from "@/features/occupational-health/lib/exam-template-snapshot";
import { EXAM_TEMPLATE_RESPONSE_KEY } from "@/features/occupational-health/lib/oh-encounter-modules";
import {
  createOhExamination,
  fetchOhExamTemplateVersions,
  fetchOhHazardProfiles,
  patchOhExaminationResponses,
} from "@/features/occupational-health/services/oh.service";
import type {
  EmploymentEpisode,
  OhExamination,
  OhHazardProfile,
  OhVisitEncounter,
} from "@/features/occupational-health/types";
import { resolveActiveRiskProfileEpisode } from "@/features/occupational-health/utils/customer-has-risk-profile";
import { newestFirst } from "@/features/occupational-health/utils/oh-format";
import {
  formatExamTypeLabel,
  MEDICAL_EXAM_START_TYPES,
} from "@/features/occupational-health/utils/oh-labels";
import { useToast } from "@/providers/toast-provider";

type OhMedicalExaminationsPanelProps = {
  encounter: OhVisitEncounter;
  episodes: EmploymentEpisode[];
  workspace: ReturnType<typeof useOhEncounterWorkspaceData>;
  onManageEmployment: () => void;
  focusedExamUuid?: string | null;
  examFocusRequest?: number;
  onActiveExamChange?: (examUuid: string | null) => void;
};

function readEnvelope(
  examination: OhExamination | null | undefined,
): ExamTemplateResponseEnvelope | null {
  const raw = examination?.responses_json?.[EXAM_TEMPLATE_RESPONSE_KEY];
  if (!raw || typeof raw !== "object") {
    return null;
  }
  return raw as ExamTemplateResponseEnvelope;
}

function isMedicalExamStartType(value: string): value is MedicalExamStartType {
  return MEDICAL_EXAM_START_TYPES.some((option) => option.value === value);
}

function findExamForType(
  examinations: OhExamination[],
  examType: string,
  examTemplateUuid: string | null,
): OhExamination | null {
  const matches = examinations.filter((exam) => exam.exam_type === examType);
  if (matches.length === 0) {
    return null;
  }
  if (examTemplateUuid) {
    const withTemplate = matches.find((exam) => {
      const envelope = readEnvelope(exam);
      return !envelope?.template_uuid || envelope.template_uuid === examTemplateUuid;
    });
    if (withTemplate) {
      return withTemplate;
    }
  }
  return (
    newestFirst(matches, (exam) => exam.examined_at ?? exam.created_at)[0] ?? null
  );
}

/** Prefer the newest exam that matches the current template, else newest start type. */
function inferExamTypeFromExaminations(
  examinations: OhExamination[],
  examTemplateUuid: string | null,
): MedicalExamStartType | null {
  const ordered = newestFirst(
    examinations,
    (exam) => exam.examined_at ?? exam.created_at,
  );
  if (examTemplateUuid) {
    const matchingTemplate = ordered.find((exam) => {
      if (!isMedicalExamStartType(exam.exam_type)) {
        return false;
      }
      const envelope = readEnvelope(exam);
      return !envelope?.template_uuid || envelope.template_uuid === examTemplateUuid;
    });
    if (matchingTemplate && isMedicalExamStartType(matchingTemplate.exam_type)) {
      return matchingTemplate.exam_type;
    }
  }
  const newest = ordered.find((exam) => isMedicalExamStartType(exam.exam_type));
  if (!newest || !isMedicalExamStartType(newest.exam_type)) {
    return null;
  }
  return newest.exam_type;
}

export function OhMedicalExaminationsPanel({
  encounter,
  episodes,
  workspace,
  focusedExamUuid = null,
  examFocusRequest = 0,
  onActiveExamChange,
}: OhMedicalExaminationsPanelProps) {
  const { toast } = useToast();
  const episode = resolveActiveRiskProfileEpisode(episodes);
  const hazardProfileId = episode?.hazard_profile ?? null;

  const profilesQuery = useQuery({
    queryKey: ["oh-hazard-profiles", episode?.employer ?? "none"],
    queryFn: () => fetchOhHazardProfiles(episode?.employer),
    enabled: Boolean(episode?.employer),
  });

  const riskProfile: OhHazardProfile | null = useMemo(() => {
    if (!hazardProfileId || !profilesQuery.data) {
      return null;
    }
    return profilesQuery.data.find((row) => row.id === hazardProfileId) ?? null;
  }, [hazardProfileId, profilesQuery.data]);

  const examTemplateUuid = riskProfile?.exam_template ?? null;

  const versionsQuery = useQuery({
    queryKey: ["oh-exam-template-versions", examTemplateUuid ?? ""],
    queryFn: () => fetchOhExamTemplateVersions(examTemplateUuid!),
    enabled: Boolean(examTemplateUuid),
  });

  const publishedVersion = useMemo(() => {
    const rows = versionsQuery.data ?? [];
    return (
      rows.find((row) => row.status === "published") ??
      [...rows].sort((a, b) => b.number - a.number)[0] ??
      null
    );
  }, [versionsQuery.data]);

  const snapshot = useMemo(
    () => parseExamTemplateSnapshot(publishedVersion?.snapshot_json),
    [publishedVersion?.snapshot_json],
  );

  const templateReady = Boolean(
    episode &&
      hazardProfileId != null &&
      riskProfile &&
      examTemplateUuid &&
      publishedVersion &&
      snapshot &&
      snapshot.sections.length > 0,
  );

  const inferredExamType = useMemo(
    () =>
      inferExamTypeFromExaminations(workspace.examinations, examTemplateUuid),
    [examTemplateUuid, workspace.examinations],
  );
  const focusedExam = useMemo(
    () =>
      focusedExamUuid
        ? (workspace.examinations.find((exam) => exam.uuid === focusedExamUuid) ?? null)
        : null,
    [focusedExamUuid, workspace.examinations],
  );
  const focusedStartType =
    focusedExam && isMedicalExamStartType(focusedExam.exam_type)
      ? focusedExam.exam_type
      : null;
  const [examTypeOverride, setExamTypeOverride] = useState<MedicalExamStartType | null>(
    null,
  );
  const selectedExamType = examTypeOverride ?? focusedStartType ?? inferredExamType;
  const [examNotes, setExamNotes] = useState("");
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const examNotesRef = useRef("");
  const [examination, setExamination] = useState<OhExamination | null>(null);
  const [answers, setAnswers] = useState<ExamTemplateAnswers>(emptyExamTemplateAnswers());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isResolvingExam, setIsResolvingExam] = useState(false);
  const createStarted = useRef(false);
  const examinationRef = useRef<OhExamination | null>(null);
  const answersHydratedKeyRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    examinationRef.current = examination;
  }, [examination]);

  const onActiveExamChangeRef = useRef(onActiveExamChange);
  useEffect(() => {
    onActiveExamChangeRef.current = onActiveExamChange;
  }, [onActiveExamChange]);

  useEffect(() => {
    if (!focusedExamUuid) {
      return;
    }
    let cancelled = false;
    async function openFocusedExam() {
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      setExamTypeOverride(null);
      setDetailsConfirmed(false);
      setEditingDetails(false);
    }
    void openFocusedExam();
    return () => {
      cancelled = true;
    };
  }, [examFocusRequest, focusedExamUuid]);

  useEffect(() => {
    let cancelled = false;
    async function syncExamination() {
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      if (!selectedExamType) {
        setExamination(null);
        examinationRef.current = null;
        setAnswers(emptyExamTemplateAnswers());
        answersHydratedKeyRef.current = null;
        onActiveExamChangeRef.current?.(null);
        return;
      }
      const matched =
        focusedExam && focusedExam.exam_type === selectedExamType
          ? focusedExam
          : findExamForType(
              workspace.examinations,
              selectedExamType,
              examTemplateUuid,
            );
      setExamination((current) => {
        if (
          current &&
          matched &&
          current.uuid === matched.uuid &&
          (current.row_version ?? 0) >= (matched.row_version ?? 0)
        ) {
          return current;
        }
        return matched;
      });

      const hydrateKey = `${matched?.uuid ?? `pending:${selectedExamType}`}:${examTemplateUuid ?? ""}`;
      if (answersHydratedKeyRef.current === hydrateKey) {
        return;
      }
      answersHydratedKeyRef.current = hydrateKey;
      if (!detailsConfirmed) {
        setExamNotes(matched?.notes ?? "");
      }
      onActiveExamChangeRef.current?.(matched?.uuid ?? null);
      const envelope = readEnvelope(matched);
      if (
        envelope?.template_uuid &&
        examTemplateUuid &&
        envelope.template_uuid === examTemplateUuid
      ) {
        setAnswers(envelope.answers ?? emptyExamTemplateAnswers());
      } else {
        setAnswers(emptyExamTemplateAnswers());
      }
    }
    void syncExamination();
    return () => {
      cancelled = true;
    };
  }, [detailsConfirmed, focusedExam, selectedExamType, examTemplateUuid, workspace.examinations]);

  async function resolveExamination(
    examType: MedicalExamStartType,
  ): Promise<OhExamination | null> {
    const existing = findExamForType(
      workspace.examinations,
      examType,
      examTemplateUuid,
    );
    if (existing) {
      setExamination(existing);
      examinationRef.current = existing;
      return existing;
    }
    if (createStarted.current) {
      return null;
    }
    createStarted.current = true;
    setIsResolvingExam(true);
    try {
      const created = await createOhExamination({
        encounter: encounter.id,
        employment_episode: episode?.id ?? null,
        exam_type: examType,
        occupational_attendance: true,
        template_code: riskProfile?.exam_template_code || riskProfile?.code || "exam",
        examined_at: new Date().toISOString(),
        notes: examNotesRef.current.trim(),
      });
      setExamination(created);
      examinationRef.current = created;
      answersHydratedKeyRef.current = `${created.uuid}:${examTemplateUuid ?? ""}`;
      workspace.refetchAll();
      return created;
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not start examination",
        description: error instanceof Error ? error.message : undefined,
      });
      return null;
    } finally {
      createStarted.current = false;
      setIsResolvingExam(false);
    }
  }

  function handleDetailsContinue(examType: MedicalExamStartType, notes: string) {
    examNotesRef.current = notes;
    setExamTypeOverride(examType);
    setExamNotes(notes);
    setDetailsConfirmed(true);
    setEditingDetails(false);
  }

  async function persistAnswers(next: ExamTemplateAnswers) {
    if (!examTemplateUuid || !snapshot || !selectedExamType) {
      return;
    }
    let exam = examinationRef.current;
    if (!exam) {
      exam = await resolveExamination(selectedExamType);
    }
    if (!exam) {
      return;
    }
    const envelope: ExamTemplateResponseEnvelope = {
      template_uuid: examTemplateUuid,
      template_name: riskProfile?.exam_template_name ?? undefined,
      version_number: publishedVersion?.number ?? null,
      hazard_profile_id: hazardProfileId,
      answers: next,
    };
    const responses_json = {
      ...(exam.responses_json ?? {}),
      [EXAM_TEMPLATE_RESPONSE_KEY]: envelope,
    };
    setSaveState("saving");
    try {
      const updated = await patchOhExaminationResponses(exam.uuid, {
        responses_json,
        row_version: exam.row_version ?? 1,
      });
      setExamination(updated);
      examinationRef.current = updated;
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      toast({
        variant: "error",
        title: "Could not save examination",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  function handleAnswersChange(next: ExamTemplateAnswers) {
    setAnswers(next);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void persistAnswers(next);
    }, 600);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!episode || hazardProfileId == null) {
    return (
      <OhCorporateWorkspace
        form={
          <PanelEmpty
            icon={ClipboardList}
            title="No risk profile on this visit"
            description="Assign a risk profile on the Employment panel so the correct examination template can load."
          />
        }
      />
    );
  }

  if (profilesQuery.isLoading || (examTemplateUuid && versionsQuery.isLoading)) {
    return (
      <OhCorporateWorkspace
        form={
          <div className="space-y-3 p-5" aria-hidden>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        }
      />
    );
  }

  if (!riskProfile) {
    return (
      <OhCorporateWorkspace
        form={
          <PanelEmpty
            icon={FileWarning}
            title="Risk profile could not be loaded"
            description="The employment episode references a risk profile that is missing or inactive."
          />
        }
      />
    );
  }

  if (!examTemplateUuid) {
    return (
      <OhCorporateWorkspace
        form={
          <PanelEmpty
            icon={ClipboardList}
            title="No examination template on this risk profile"
            description={`Attach and publish an exam template on “${riskProfile.name}” in Occupational Health settings.`}
          />
        }
      />
    );
  }

  if (!publishedVersion || !snapshot || snapshot.sections.length === 0) {
    return (
      <OhCorporateWorkspace
        form={
          <PanelEmpty
            icon={ClipboardList}
            title="Examination template is not published"
            description="Publish the exam template linked to this risk profile before completing medical examinations."
          />
        }
      />
    );
  }

  const resumedExistingExam =
    inferredExamType != null && examTypeOverride == null && focusedStartType == null;
  const openedFocusedExam = focusedStartType != null && examTypeOverride == null;
  const showTemplate =
    Boolean(selectedExamType) &&
    !editingDetails &&
    (detailsConfirmed || resumedExistingExam || openedFocusedExam);
  const saveLabel =
    isResolvingExam
      ? "Starting"
      : saveState === "saving"
        ? "Saving"
        : saveState === "saved"
          ? "Saved"
          : saveState === "error"
            ? "Save failed"
            : null;

  return (
    <OhCorporateWorkspace
      form={
        showTemplate ? (
          <div className="space-y-8 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-[13.5px] font-semibold text-brand-navy">
                    {formatExamTypeLabel(selectedExamType!)}
                  </h2>
                  <Badge variant="secondary" className="shrink-0">
                    {riskProfile.name}
                  </Badge>
                </div>
                {examNotes.trim() ? (
                  <p className="mt-1 text-[13px] text-dash-muted">{examNotes.trim()}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setEditingDetails(true)}
                data-testid="oh-exam-change-type"
                className="shrink-0 text-[13px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
              >
                Change type
              </button>
            </div>
            {saveLabel ? (
              <p className="-mt-5 text-[12px] text-dash-muted" aria-live="polite">
                {saveLabel}
              </p>
            ) : null}
            <OhExamTemplateCaptureForm
              snapshot={snapshot}
              templateName={riskProfile.exam_template_name}
              value={answers}
              onChange={handleAnswersChange}
            />
            <OhProcedureChecklistPanel
              examination={examination}
              onChanged={workspace.refetchAll}
            />
          </div>
        ) : (
          <ExamDetailsStep
            initialType={
              selectedExamType && isMedicalExamStartType(selectedExamType)
                ? selectedExamType
                : null
            }
            initialNotes={examNotes}
            onContinue={handleDetailsContinue}
          />
        )
      }
    />
  );
}

function ExamDetailsStep({
  initialType,
  initialNotes,
  onContinue,
}: {
  initialType: MedicalExamStartType | null;
  initialNotes: string;
  onContinue: (examType: MedicalExamStartType, notes: string) => void;
}) {
  const [examType, setExamType] = useState<MedicalExamStartType | "">(
    initialType ?? "",
  );
  const [notes, setNotes] = useState(initialNotes);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isMedicalExamStartType(examType)) {
      return;
    }
    onContinue(examType, notes.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 px-5 py-5"
      data-testid="oh-exam-details-step"
    >
      <div className="space-y-1.5">
        <Label htmlFor="oh-exam-start-type" className="text-[13px] font-medium text-brand-navy">
          Exam type <RequiredFieldMarker />
        </Label>
        <Select
          value={examType}
          onValueChange={(value) => {
            if (isMedicalExamStartType(value)) {
              setExamType(value);
            }
          }}
        >
          <SelectTrigger
            id="oh-exam-start-type"
            className="h-10 w-full rounded-lg border-dash-border bg-white"
          >
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className={appFont.className}>
            {MEDICAL_EXAM_START_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="oh-exam-start-notes" className="text-[13px] font-medium text-brand-navy">
          Note
        </Label>
        <Textarea
          id="oh-exam-start-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          placeholder="Reason for attendance, history, observations"
          className="min-h-24 rounded-lg border-dash-border bg-white text-[13.5px] shadow-none"
        />
      </div>
      <PrimaryButton
        type="submit"
        className="h-10"
        disabled={!examType}
        data-testid="oh-exam-details-continue"
      >
        Continue
      </PrimaryButton>
    </form>
  );
}

function PanelEmpty({
  icon,
  title,
  description,
}: {
  icon: typeof ClipboardList;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-white px-6 py-16">
      <EmptyState icon={icon} title={title} description={description} />
    </div>
  );
}
