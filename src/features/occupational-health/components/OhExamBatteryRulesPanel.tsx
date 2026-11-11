"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createOhExamBatteryRule,
  fetchOhExamBatteryRules,
  fetchOhHazardProfiles,
  runOhSurveillanceSchedule,
  updateOhExamBatteryRule,
} from "@/features/occupational-health/services/oh.service";
import { EXAM_TYPES } from "@/features/occupational-health/utils/oh-labels";
import { appFont } from "@/lib/fonts";
import { useToast } from "@/providers/toast-provider";

/**
 * Exam battery rules drive surveillance: each active rule creates a due requirement for every
 * worker on the hazard profile, repeating every N months. Requirements are generated nightly;
 * "Generate now" runs the same job immediately.
 */
export function OhExamBatteryRulesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rulesQuery = useQuery({
    queryKey: ["oh-exam-battery-rules"],
    queryFn: fetchOhExamBatteryRules,
  });
  const profilesQuery = useQuery({
    queryKey: ["oh-hazard-profiles", "all"],
    queryFn: () => fetchOhHazardProfiles(),
  });
  const profiles = profilesQuery.data ?? [];
  const [componentCode, setComponentCode] = useState("");
  const [examType, setExamType] = useState("periodic");
  const [months, setMonths] = useState("12");
  const [pickedProfileId, setPickedProfileId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const profileId = pickedProfileId || (profiles[0] ? String(profiles[0].id) : "");
  const profileName = (id: number | null) =>
    profiles.find((profile) => profile.id === id)?.name ?? "Hazard rule";
  const periodicity = months.trim() === "" ? null : Number(months);
  const canSave =
    componentCode.trim() !== "" &&
    profileId !== "" &&
    (periodicity === null || (Number.isInteger(periodicity) && periodicity > 0));

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["oh-exam-battery-rules"] }),
      queryClient.invalidateQueries({ queryKey: ["oh-compliance-dashboard"] }),
    ]);
  }

  async function handleAdd() {
    if (!canSave) {
      return;
    }
    setIsSaving(true);
    try {
      await createOhExamBatteryRule({
        component_code: componentCode.trim().toUpperCase(),
        exam_type: examType,
        periodicity_months: periodicity,
        hazard_profile: Number(profileId),
      });
      setComponentCode("");
      toast({ variant: "success", title: "Rule added" });
      await refresh();
    } catch (error) {
      toast({
        title: "Could not add rule",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggle(uuid: string, isActive: boolean) {
    try {
      await updateOhExamBatteryRule(uuid, { is_active: !isActive });
      await refresh();
    } catch (error) {
      toast({
        title: "Could not update rule",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
  }

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const result = await runOhSurveillanceSchedule();
      toast({
        variant: "success",
        title: "Surveillance updated",
        description: `${result.created} created, ${result.completed} completed, ${result.overdue} now overdue.`,
      });
      await refresh();
    } catch (error) {
      toast({
        title: "Could not generate requirements",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  const rules = rulesQuery.data ?? [];

  return (
    <section className="space-y-4 px-4 py-4 md:px-6" data-testid="oh-exam-battery-rules">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-brand-navy">Exam battery rules</h2>
          <p className="text-[13px] text-dash-muted">
            Each active rule creates a due requirement for every worker on the hazard profile.
          </p>
        </div>
        <SecondaryButton
          type="button"
          size="sm"
          disabled={isGenerating}
          onClick={() => void handleGenerate()}
        >
          {isGenerating ? "Generating…" : "Generate now"}
        </SecondaryButton>
      </div>

      {rulesQuery.isLoading ? (
        <p className="text-sm text-brand-muted">Loading rules…</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-brand-muted">No rules yet. Add one below.</p>
      ) : (
        <ul className="divide-y divide-dash-border rounded-lg border border-dash-border">
          {rules.map((rule) => (
            <li
              key={rule.uuid}
              className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]"
            >
              <span className={rule.is_active ? "text-brand-navy" : "text-dash-muted line-through"}>
                <span className="font-medium">{rule.component_code}</span> ·{" "}
                {EXAM_TYPES.find((type) => type.value === rule.exam_type)?.label ?? rule.exam_type} ·{" "}
                {rule.periodicity_months ? `every ${rule.periodicity_months} months` : "once"} ·{" "}
                {profileName(rule.hazard_profile_id)}
              </span>
              <SecondaryButton
                type="button"
                size="sm"
                onClick={() => void handleToggle(rule.uuid, rule.is_active)}
              >
                {rule.is_active ? "Deactivate" : "Activate"}
              </SecondaryButton>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 md:grid-cols-5 md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="oh-rule-component">Component code</Label>
          <Input
            id="oh-rule-component"
            value={componentCode}
            placeholder="AUDIO"
            onChange={(event) => setComponentCode(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oh-rule-exam-type">Exam type</Label>
          <Select value={examType} onValueChange={setExamType}>
            <SelectTrigger id="oh-rule-exam-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={appFont.className}>
              {EXAM_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oh-rule-months">Every (months)</Label>
          <Input
            id="oh-rule-months"
            inputMode="numeric"
            value={months}
            placeholder="Once"
            onChange={(event) => setMonths(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oh-rule-profile">Hazard profile</Label>
          <Select value={profileId} onValueChange={setPickedProfileId}>
            <SelectTrigger id="oh-rule-profile" className="w-full">
              <SelectValue placeholder="Hazard profile" />
            </SelectTrigger>
            <SelectContent className={appFont.className}>
              {profiles.map((profile) => (
                <SelectItem key={profile.uuid} value={String(profile.id)}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <PrimaryButton
          type="button"
          disabled={!canSave || isSaving}
          onClick={() => void handleAdd()}
        >
          {isSaving ? "Adding…" : "Add rule"}
        </PrimaryButton>
      </div>
    </section>
  );
}
