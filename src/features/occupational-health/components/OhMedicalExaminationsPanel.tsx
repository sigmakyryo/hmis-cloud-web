"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OhFormSetupRequired } from "@/features/occupational-health/components/OhFormSetupRequired";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { focusFirstExamError, validateExamAnswers, type ExamErrors } from "../lib/exam-template-validation";
import { ROUTES } from "@/constants/routes";
import { useUser } from "@/providers/user-provider";
import { OhExaminationSetupState } from "@/features/occupational-health/components/OhExaminationSetupState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SecondaryButton } from "@/components/ui/app-buttons";
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
import { OhExamAnswersView, visitAnswerSubject } from "@/features/occupational-health/components/OhExamAnswersView";
import { OhExamTemplateCaptureForm } from "@/features/occupational-health/components/OhExamTemplateCaptureForm";
import { OhProcedureChecklistPanel } from "@/features/occupational-health/components/OhProcedureChecklistPanel";
import type { useOhEncounterWorkspaceData } from "@/features/occupational-health/hooks/use-occupational-health";
import {
  emptyExamTemplateAnswers,
  hasCompleteExamDefinitions,
  remapUnansweredExamPicks,
  parseExamTemplateSnapshot,
  type ExamTemplateAnswers,
  type ExamTemplateResponseEnvelope,
} from "@/features/occupational-health/lib/exam-template-snapshot";
import { EXAM_TEMPLATE_RESPONSE_KEY, type OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import {
  createOhExamination,
  publishOhExamTemplate,
  recoverOhExaminationVersion,
  fetchOhExamTemplateVersions,
  fetchOhHazardProfiles,
  patchOhExaminationResponses,
} from "@/features/occupational-health/services/oh.service";
import type {
  EmploymentEpisode,
  OhExamination,
  OhExamTemplateVersion,
  OhHazardProfile,
  OhVisitEncounter,
} from "@/features/occupational-health/types";
import { resolveActiveRiskProfileEpisode } from "@/features/occupational-health/utils/customer-has-risk-profile";
import { newestFirst } from "@/features/occupational-health/utils/oh-format";
import {
  examTypeForVisitCode,
  formatExamTypeLabel,
  MEDICAL_EXAM_START_TYPES,
} from "@/features/occupational-health/utils/oh-labels";
import {
  examAnswerSections,
  examAnswerSummary,
  examAnswersAreComplete,
} from "@/features/occupational-health/lib/exam-answers-display";
import { examinationPdfUrl } from "@/features/occupational-health/services/oh-ext.service";
import { useVisitEvidence } from "@/features/occupational-health/hooks/use-visit-evidence";
import { useToast } from "@/providers/toast-provider";

type OhMedicalExaminationsPanelProps = {
  encounter: OhVisitEncounter;
  completionRef?: { current: (() => Promise<boolean>) | null };
  completing?: boolean;
  episodes: EmploymentEpisode[];
  workspace: ReturnType<typeof useOhEncounterWorkspaceData>;
  onManageEmployment: () => void;
  focusedExamUuid?: string | null;
  examFocusRequest?: number;
  onActiveExamChange?: (examUuid: string | null) => void;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
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
  completionRef,
  completing = false,
  episodes,
  workspace,
  onManageEmployment,
  focusedExamUuid = null,
  examFocusRequest = 0,
  onActiveExamChange,
  onOpenPanel,
}: OhMedicalExaminationsPanelProps) {
  const { toast } = useToast();
  const { userData } = useUser();
  const evidence = useVisitEvidence({
    customerUuid: encounter.customer_uuid,
    encounterUuid: encounter.uuid,
  });
  const canConfigure = Boolean(userData?.is_admin);
  const queryClient = useQueryClient();
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const episode = resolveActiveRiskProfileEpisode(episodes);
  const hazardProfileId = episode?.hazard_profile ?? null;

  const profilesQuery = useQuery({
    queryKey: ["oh-hazard-profiles", episode?.employer ?? "none"],
    queryFn: () => fetchOhHazardProfiles(episode?.employer),
    enabled: Boolean(episode?.employer),
    retry: false,
    refetchOnMount: "always",
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
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const publishedVersion = useMemo(() => {
    const rows = versionsQuery.data ?? [];
    const published = [...rows].filter((row) => row.status === "published").sort((a, b) => b.number - a.number || b.id - a.id);
    return published.find((row) => hasCompleteExamDefinitions(row.snapshot_json)) ?? published[0] ?? null;
  }, [versionsQuery.data]);

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
  const visitExamType = examTypeForVisitCode(encounter.visit_type?.code);
  const typeFromVisit = visitExamType != null;
  const selectedExamType = typeFromVisit
    ? visitExamType
    : examTypeOverride ?? focusedStartType ?? inferredExamType;
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
  const [displayedVersion, setDisplayedVersion] = useState<OhExamTemplateVersion | null>(null);
  const historicalEnvelope = readEnvelope(examination);
  const historicalTemplateUuid = examination?.template_uuid ?? historicalEnvelope?.template_uuid ?? examTemplateUuid;
  const historicalVersions = useQuery({
    queryKey: ["oh-exam-template-versions", historicalTemplateUuid ?? ""],
    queryFn: () => fetchOhExamTemplateVersions(historicalTemplateUuid!),
    enabled: Boolean(examination && !examination.template_snapshot && historicalTemplateUuid),
    retry: false,
    staleTime: 0,
  });
  const historicalVersion = examination ? (historicalVersions.data ?? versionsQuery.data ?? []).find((v) =>
    v.status === "published" && (examination.template_version_uuid
      ? v.uuid === examination.template_version_uuid
      : Boolean(historicalEnvelope?.version_number) && v.number === historicalEnvelope?.version_number && v.template === historicalTemplateUuid)) : null;
  const captureVersion = examination ? historicalVersion : displayedVersion ?? publishedVersion;
  const versionUuid = examination?.template_version_uuid ?? captureVersion?.uuid ?? null;
  const captureTemplateUuid = examination?.template_uuid ?? historicalEnvelope?.template_uuid ?? captureVersion?.template ?? examTemplateUuid;
  const snapshot = useMemo(() => parseExamTemplateSnapshot(
    examination?.template_snapshot ?? captureVersion?.snapshot_json,
  ), [examination?.template_snapshot, captureVersion?.snapshot_json]);
  const definitionsMissing = Boolean(snapshot?.sections.some((section) => section.content_mode === "direct" ? section.response_definitions_missing : section.items.some((item) => item.response_definitions_missing)));
  const hasEnteredResponses = Object.values(answers.fields).some((fields) => Object.values(fields).some((value) => typeof value !== "string" || value.trim() !== ""));
  const readyReplacement = [...(versionsQuery.data ?? [])].filter((row) => row.status === "published" && hasCompleteExamDefinitions(row.snapshot_json) && row.uuid !== versionUuid).sort((a, b) => b.number - a.number || b.id - a.id)[0];
  const templateReady = Boolean(snapshot?.sections.length && versionUuid);
  const answersHydratedKeyRef = useRef<string | null>(null);
  const [validationShown, setValidationShown] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const answersRef = useRef<ExamTemplateAnswers>(emptyExamTemplateAnswers());
  const saveQueue = useRef<Promise<boolean>>(Promise.resolve(true));
  const formRef = useRef<HTMLDivElement>(null);
  const [editingAnswers, setEditingAnswers] = useState(false);
  const [completedThisSession, setCompletedThisSession] = useState(false);
  const [createdExamUuid, setCreatedExamUuid] = useState<string | null>(null);
  const validationErrors: ExamErrors = validationShown && snapshot ? validateExamAnswers(snapshot, answers) : {};
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => {
    if (!completionRef) return;
    completionRef.current = async () => {
      if (encounter.is_active === false) return false;
      setValidationShown(true);
      if (!snapshot || !selectedExamType || (!typeFromVisit && !detailsConfirmed && !examination)) {
        setValidationMessage("Choose the examination type and continue before completing this visit.");
        return false;
      }
      const errors = validateExamAnswers(snapshot, answersRef.current);
      if (Object.keys(errors).length) {
        setValidationMessage("Review the highlighted responses before completing this visit.");
        requestAnimationFrame(() => {
          focusFirstExamError(formRef.current, errors);
        });
        return false;
      }
      setValidationMessage(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      await saveQueue.current;
      const result = await persistAnswers(answersRef.current);
      if (!result) setValidationMessage("Your responses could not be saved. The visit has not been completed. Please try again.");
      if (result) {
        setCreatedExamUuid(null);
        setEditingAnswers(false);
        setCompletedThisSession(true);
      }
      return result;
    };
    return () => { completionRef.current = null; };
  });

  const answersDecideKey = `${selectedExamType ?? ""}:${examination?.uuid ?? ""}:${snapshot ? "ready" : "pending"}`;
  const [answersSessionKey, setAnswersSessionKey] = useState(answersDecideKey);
  if (answersSessionKey !== answersDecideKey) {
    setAnswersSessionKey(answersDecideKey);
    setEditingAnswers(false);
    setCompletedThisSession(false);
  }
  const openedExistingComplete = Boolean(
    examination &&
      snapshot &&
      createdExamUuid !== examination.uuid &&
      readEnvelope(examination)?.answers &&
      examAnswersAreComplete(snapshot, readEnvelope(examination)!.answers),
  );
  const answersView = !editingAnswers && (completedThisSession || openedExistingComplete);

  const focusedValidationRequest = useRef<number | null>(null);
  useEffect(() => {
    if (!validationShown || !snapshot || !focusedExamUuid || examination?.uuid !== focusedExamUuid || focusedValidationRequest.current === examFocusRequest) return;
    const errors = validateExamAnswers(snapshot, answers);
    if (Object.keys(errors).length) {
      focusedValidationRequest.current = examFocusRequest;
      requestAnimationFrame(() => focusFirstExamError(formRef.current, errors));
    }
  }, [answers, examFocusRequest, examination?.uuid, focusedExamUuid, snapshot, validationShown]);
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
            ) ?? (examinationRef.current?.exam_type === selectedExamType && examinationRef.current.encounter === encounter.id ? examinationRef.current : null);
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
      if (envelope?.template_uuid) {
        setAnswers(envelope.answers ?? emptyExamTemplateAnswers());
      } else {
        setAnswers(emptyExamTemplateAnswers());
      }
    }
    void syncExamination();
    return () => {
      cancelled = true;
    };
  }, [detailsConfirmed, encounter.id, focusedExam, selectedExamType, examTemplateUuid, workspace.examinations]);

  async function resolveExamination(
    examType: string,
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
        template_version_uuid: versionUuid,
        employment_episode: episode?.id ?? null,
        exam_type: examType,
        occupational_attendance: true,
        template_code: riskProfile?.exam_template_code || riskProfile?.code || "exam",
        examined_at: new Date().toISOString(),
        notes: examNotesRef.current.trim(),
      });
      setExamination(created);
      examinationRef.current = created;
      setCreatedExamUuid(created.uuid);
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
    if (encounter.is_active === false || completing) return;
    setValidationMessage(null);
    examNotesRef.current = notes;
    setExamTypeOverride(examType);
    setExamNotes(notes);
    setDisplayedVersion(publishedVersion);
    setDetailsConfirmed(true);
    setEditingDetails(false);
  }

  async function persistAnswers(next: ExamTemplateAnswers) {
    if (examination?.template_available === false || (!examination && riskProfile?.exam_template_available === false) || encounter.is_active === false || !captureTemplateUuid || !versionUuid || !snapshot || !selectedExamType) {
      return false;
    }
    let exam = examinationRef.current;
    if (!exam) {
      exam = await resolveExamination(selectedExamType);
    }
    if (!exam) {
      return false;
    }
    const envelope: ExamTemplateResponseEnvelope = {
      template_uuid: captureTemplateUuid,
      template_version_uuid: exam.template_version_uuid ?? versionUuid,
      template_name: riskProfile?.exam_template_name ?? undefined,
      version_number: exam.template_version_number ?? captureVersion?.number ?? historicalEnvelope?.version_number ?? null,
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
      return true;
    } catch (error) {
      setSaveState("error");
      toast({
        variant: "error",
        title: "Could not save examination",
        description: error instanceof Error ? error.message : undefined,
      });
      return false;
    }
  }

  async function loadUpdatedForm() {
    if (!snapshot || !captureTemplateUuid || hasEnteredResponses || encounter.is_active === false || recovering) return;
    setRecovering(true); setRecoveryError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    try {
      await saveQueue.current;
      if (examinationRef.current && !(await persistAnswers(answersRef.current))) throw new Error("Your selections could not be saved. The examination has not been changed.");
      const target = readyReplacement ?? (canConfigure ? await publishOhExamTemplate(captureTemplateUuid) : null);
      if (!target || !hasCompleteExamDefinitions(target.snapshot_json)) throw new Error("The configured form could not be loaded. Ask an administrator to review it.");
      if (examinationRef.current) {
        const updated = await recoverOhExaminationVersion(examinationRef.current.uuid, { row_version: examinationRef.current.row_version ?? 1, template_version_uuid: target.uuid });
        setExamination(updated); examinationRef.current = updated;
        const recovered = readEnvelope(updated)?.answers ?? emptyExamTemplateAnswers();
        answersRef.current = recovered; setAnswers(recovered);
        workspace.refetchAll();
      } else {
        const recovered = remapUnansweredExamPicks(snapshot, parseExamTemplateSnapshot(target.snapshot_json)!, answersRef.current);
        answersRef.current = recovered; setAnswers(recovered);
      }
      setDisplayedVersion(target);
      queryClient.setQueryData<OhExamTemplateVersion[]>(["oh-exam-template-versions", captureTemplateUuid], (rows) => [target, ...(rows ?? []).filter((row) => row.uuid !== target.uuid)]);
      setValidationShown(false); setValidationMessage(null); setRecoveryOpen(false);
    } catch (error) { setRecoveryError(error instanceof Error ? error.message : "Could not load the updated form. Your examination has not been changed."); }
    finally { setRecovering(false); }
  }

  function handleAnswersChange(next: ExamTemplateAnswers) {
    if (encounter.is_active === false || completing || recovering) return;
    answersRef.current = next;
    setValidationMessage(null);
    setAnswers(next);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      saveQueue.current = saveQueue.current.then(() => persistAnswers(next));
    }, 600);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [encounter.is_active]);

  async function recheckSetup() {
    setRefreshing(true); setSetupError(null);
    try {
      if (examination && historicalTemplateUuid) {
        await queryClient.fetchQuery({
          queryKey: ["oh-exam-template-versions", historicalTemplateUuid],
          queryFn: () => fetchOhExamTemplateVersions(historicalTemplateUuid),
          staleTime: 0,
        });
        await workspace.refetchAll();
        return;
      }
      if (encounter.customer_uuid) await queryClient.invalidateQueries({ queryKey: ["oh-employment-episodes", encounter.customer_uuid] });
      const profiles = await profilesQuery.refetch({ throwOnError: true });
      const current = profiles.data?.find((row) => row.id === hazardProfileId);
      if (current?.exam_template) {
        await queryClient.fetchQuery({
          queryKey: ["oh-exam-template-versions", current.exam_template],
          queryFn: () => fetchOhExamTemplateVersions(current.exam_template!),
          staleTime: 0,
        });
      }
    } catch {
      setSetupError("We couldn't check the setup. Please try again.");
    } finally { setRefreshing(false); }
  }

  function setupState(title: string, description: string, href?: string, actionLabel?: string, onAction?: () => void) {
    return <OhCorporateWorkspace form={<OhExaminationSetupState
      title={title} description={description} href={canConfigure ? href : undefined}
      actionLabel={onAction ? actionLabel : canConfigure ? actionLabel : undefined} onAction={onAction}
      needsAdministrator={Boolean(href) && !canConfigure && !onAction} refreshing={refreshing || profilesQuery.isFetching || versionsQuery.isFetching}
      onRecheck={() => void recheckSetup()} error={setupError}
    />} />;
  }

  if (encounter.is_active !== false && (examination?.template_available === false || (!examination && riskProfile?.exam_template_available === false))) {
    return <OhCorporateWorkspace form={<OhFormSetupRequired
      form="the medical examination"
      profile={riskProfile}
      pinned={examination?.template_available === false}
      refreshing={refreshing || profilesQuery.isFetching}
      onRecheck={() => void recheckSetup()}
    />} />;
  }

  if (!templateReady && (!episode || hazardProfileId == null)) {
    return setupState("Choose a risk profile", "Add an active employment and risk profile to choose the right examination.", undefined, "Manage employment", onManageEmployment);
  }

  if ((!examination && !displayedVersion && (profilesQuery.isFetching || versionsQuery.isFetching)) || (!templateReady && (profilesQuery.isLoading || (examTemplateUuid && versionsQuery.isLoading) || historicalVersions.isLoading))) {
    return <OhCorporateWorkspace form={<div role="status" aria-label="Loading examination setup" className="space-y-3 p-5">
      <Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-24 w-full" />
    </div>} />;
  }
  if ((!examination && !displayedVersion && (profilesQuery.isError || versionsQuery.isError)) || (!templateReady && (profilesQuery.isError || (examTemplateUuid && versionsQuery.isError) || historicalVersions.isError))) {
    return setupState("Couldn't load examination setup", "We couldn't check the risk profile and its examination template. Please try again.");
  }
  if (!templateReady && !riskProfile) {
    return setupState("Risk profile needs attention", "Review the active employment and its assigned risk profile.", undefined, "Manage employment", onManageEmployment);
  }
  if (!templateReady && !examTemplateUuid) {
    const href = riskProfile?.employer_uuid
      ? `${ROUTES.settingsOccupationalHealthEmployer(riskProfile!.employer_uuid!, "risk-profiles")}&profile=${encodeURIComponent(riskProfile!.uuid)}`
      : ROUTES.settingsModuleOccupationalHealth;
    return setupState("Set up this examination", `Choose an examination template for “${riskProfile?.name}” to get started.`, href, "Choose exam template");
  }
  if (!templateReady && !publishedVersion) {
    return setupState("Publish the examination template", `Review and publish “${riskProfile?.exam_template_name || "the linked examination template"}” so this examination can begin.`, ROUTES.ohTemplateBuilder("exam", examTemplateUuid!), "Review and publish");
  }
  if (examination && !templateReady) {
    return setupState("Saved examination version unavailable", "The original template version could not be recovered. Your saved answers have been preserved; contact an administrator before making changes.");
  }
  if (!snapshot || snapshot.sections.length === 0) {
    return setupState("Finish the examination template", "Add examination sections and publish an updated version before starting.", ROUTES.ohTemplateBuilder("exam", examTemplateUuid!), "Edit exam template");
  }

  const resumedExistingExam =
    inferredExamType != null && examTypeOverride == null && focusedStartType == null;
  const openedFocusedExam = focusedStartType != null && examTypeOverride == null;
  const showTemplate =
    Boolean(selectedExamType) &&
    (typeFromVisit || (!editingDetails && (detailsConfirmed || resumedExistingExam || openedFocusedExam)));
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
          <div ref={formRef} className="space-y-4 px-5 py-4">
            <header className="space-y-1.5">
              {answersView ? null : (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h2 className="text-[15px] font-semibold text-brand-navy">{historicalEnvelope?.template_name ?? riskProfile?.exam_template_name ?? "Examination"}</h2>
                <div className="flex flex-wrap items-center gap-3"><span className="text-xs text-dash-muted" aria-live="polite">{saveLabel}</span>{definitionsMissing && encounter.is_active !== false && !hasEnteredResponses && (canConfigure || readyReplacement) ? <SecondaryButton type="button" disabled={recovering || completing} onClick={() => { setRecoveryError(null); setRecoveryOpen(true); }}>Load configured fields</SecondaryButton> : null}{typeFromVisit ? null : <button type="button" disabled={encounter.is_active === false || completing} onClick={() => setEditingDetails(true)} data-testid="oh-exam-change-type" className="text-[13px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:opacity-50">Change type</button>}</div>
              </div>
              )}
              <p className="text-xs text-dash-muted"><span>{formatExamTypeLabel(selectedExamType!)}</span><span aria-hidden> · </span><span>{riskProfile?.name ?? "Examination"}</span>{examination?.template_version_number || captureVersion?.number ? ` · Version ${examination?.template_version_number ?? captureVersion?.number}` : ""}</p>
            </header>

            <Dialog open={recoveryOpen} onOpenChange={(open) => { if (!recovering) setRecoveryOpen(open); }}><DialogContent className={appFont.className}><DialogHeader><DialogTitle>Use updated examination form?</DialogTitle><DialogDescription>{readyReplacement ? `Use published version ${readyReplacement.number} for this unanswered examination.` : "Publish the configured fields as a new version and use them for this unanswered examination."} Existing entered responses and completed examinations are not changed. Unchanged item selections are kept.</DialogDescription></DialogHeader>{recoveryError ? <p role="alert" className="text-sm text-red-700">{recoveryError}</p> : null}<DialogFooter><SecondaryButton type="button" disabled={recovering} onClick={() => setRecoveryOpen(false)}>Cancel</SecondaryButton><PrimaryButton type="button" disabled={recovering} onClick={() => void loadUpdatedForm()}>{recovering ? "Loading fields…" : readyReplacement ? "Use published version" : "Publish and load fields"}</PrimaryButton></DialogFooter></DialogContent></Dialog>
            {validationMessage || (!answersView && Object.keys(validationErrors).length) ? <div role="alert" className="border-l-2 border-red-500 px-3 py-1 text-sm text-red-800">{!answersView && Object.keys(validationErrors).length ? "Review the highlighted responses before completing this visit." : validationMessage}</div> : null}
            {answersView && examination ? (
              <OhExamAnswersView
                heading={historicalEnvelope?.template_name ?? riskProfile?.exam_template_name ?? "Examination"}
                subject={visitAnswerSubject(encounter, episode)}
                sections={examAnswerSections(snapshot, answers)}
                summary={examAnswerSummary(snapshot, answers, "exam")}
                completedAt={examination.examined_at ?? examination.updated_at}
                completedBy={encounter.clinician_name}
                notes={examNotes}
                pdfUrl={examinationPdfUrl(examination.uuid)}
                onEdit={encounter.is_active === false ? null : () => setEditingAnswers(true)}
                family="exam"
                evidence={evidence.lines}
                evidenceLoading={evidence.loading}
                onOpenPanel={onOpenPanel}
              />
            ) : (
              <>
            <OhExamTemplateCaptureForm
              disabled={encounter.is_active === false || completing || recovering}
              errors={validationErrors}
              setupHref={canConfigure && captureTemplateUuid ? ROUTES.ohTemplateBuilder("exam", captureTemplateUuid) : undefined}
              snapshot={snapshot}
              templateName={historicalEnvelope?.template_name ?? riskProfile?.exam_template_name}
              value={answers}
              onChange={handleAnswersChange}
              billingCharges={examination?.billing_charges ?? []}
            />
            {examNotes.trim() ? <p className="text-sm text-dash-muted">{examNotes.trim()}</p> : null}
              </>
            )}
            <fieldset disabled={encounter.is_active === false || completing}><OhProcedureChecklistPanel
              examination={examination}
              onChanged={workspace.refetchAll}
            /></fieldset>
          </div>
        ) : typeFromVisit ? null : (
          <div>{validationMessage ? <p role="alert" className="px-5 pt-4 text-sm text-red-700">{validationMessage}</p> : null}<ExamDetailsStep
            initialType={
              selectedExamType && isMedicalExamStartType(selectedExamType)
                ? selectedExamType
                : null
            }
            initialNotes={examNotes}
            onContinue={handleDetailsContinue}
          /></div>
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

