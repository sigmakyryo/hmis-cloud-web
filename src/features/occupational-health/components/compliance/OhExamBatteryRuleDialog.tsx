"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { OhExamBatteryRule, OhHazardProfile } from "@/features/occupational-health/types";
import { EXAM_TYPES } from "@/features/occupational-health/utils/oh-labels";
import { appFont } from "@/lib/fonts";

export type OhRuleDraft = {
  component_code: string;
  exam_type: string;
  periodicity_months: number | null;
  hazard_profile: number;
  is_active: boolean;
};

type OhExamBatteryRuleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rule to edit; null creates a new one. */
  rule: OhExamBatteryRule | null;
  profiles: OhHazardProfile[];
  isSaving: boolean;
  onSave: (draft: OhRuleDraft) => void;
};

/** Create a rule, or edit an existing rule's frequency and status (component, exam and profile are fixed once created). */
export function OhExamBatteryRuleDialog(props: OhExamBatteryRuleDialogProps) {
  // Remount per rule / open so the form starts from the rule's values without syncing state in effects.
  return props.open ? <RuleForm key={props.rule?.uuid ?? "new"} {...props} /> : <Dialog open={false} />;
}

function RuleForm({ open, onOpenChange, rule, profiles, isSaving, onSave }: OhExamBatteryRuleDialogProps) {
  const editing = rule !== null;
  const [componentCode, setComponentCode] = useState(rule?.component_code ?? "");
  const [examType, setExamType] = useState(rule?.exam_type ?? "periodic");
  const [months, setMonths] = useState(rule ? (rule.periodicity_months === null ? "" : String(rule.periodicity_months)) : "12");
  const [pickedProfile, setPickedProfile] = useState(rule?.hazard_profile_id ? String(rule.hazard_profile_id) : "");
  const [active, setActive] = useState(rule?.is_active ?? true);
  const [touched, setTouched] = useState(false);

  const profileId = pickedProfile || (profiles[0] ? String(profiles[0].id) : "");
  const periodicity = months.trim() === "" ? null : Number(months);
  const monthsValid = periodicity === null || (Number.isInteger(periodicity) && periodicity > 0 && periodicity <= 120);
  const codeValid = /^[A-Za-z0-9_-]{2,20}$/.test(componentCode.trim());
  const canSave = monthsValid && (editing || (codeValid && profileId !== ""));

  return (
    <Dialog open={open} onOpenChange={(next) => (isSaving ? undefined : onOpenChange(next))}>
      <DialogContent className={`${appFont.className} max-w-lg`} data-testid="oh-rule-dialog">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? `Edit rule ${rule.component_code}` : "New exam battery rule"}</DialogTitle>
          <DialogDescription className="text-[13px]">
            Every worker on the hazard profile gets a due requirement for this exam, repeating at the chosen frequency.
          </DialogDescription>
        </DialogHeader>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (canSave) {
              onSave({
                component_code: componentCode.trim().toUpperCase(),
                exam_type: examType,
                periodicity_months: periodicity,
                hazard_profile: Number(profileId),
                is_active: active,
              });
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="oh-rule-component">Component code</Label>
            <Input
              id="oh-rule-component"
              value={componentCode}
              placeholder="AUDIO"
              disabled={editing}
              aria-invalid={touched && !editing && !codeValid}
              onChange={(e) => setComponentCode(e.target.value)}
            />
            {touched && !editing && !codeValid ? <p className="text-[12px] text-red-700">2–20 letters, digits, - or _.</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oh-rule-exam-type">Exam type</Label>
            <Select value={examType} onValueChange={setExamType} disabled={editing}>
              <SelectTrigger id="oh-rule-exam-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={appFont.className}>
                {EXAM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
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
              aria-invalid={!monthsValid}
              onChange={(e) => setMonths(e.target.value)}
            />
            <p className={monthsValid ? "text-[12px] text-dash-muted" : "text-[12px] text-red-700"}>
              {monthsValid ? "Leave empty for a one-off exam." : "Whole months from 1 to 120."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oh-rule-profile">Hazard profile</Label>
            <Select value={profileId} onValueChange={setPickedProfile} disabled={editing || profiles.length === 0}>
              <SelectTrigger id="oh-rule-profile" className="w-full">
                <SelectValue placeholder={profiles.length === 0 ? "No hazard profiles yet" : "Hazard profile"} />
              </SelectTrigger>
              <SelectContent className={appFont.className}>
                {profiles.map((p) => (
                  <SelectItem key={p.uuid} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {editing ? (
            <label className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={active} onCheckedChange={setActive} aria-label="Rule active" />
              <span className="text-[13px] text-brand-slate">
                {active ? "Active: creates requirements on the next run" : "Inactive: no new requirements; open ones stay"}
              </span>
            </label>
          ) : null}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" variant="primary" disabled={isSaving || (touched && !canSave) || (!editing && !codeValid)}>
              {isSaving ? "Saving…" : editing ? "Save changes" : "Add rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
