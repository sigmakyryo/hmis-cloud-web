"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Wand2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ListPageDataTable,
  ListPageDataTableBody,
  ListPageDataTableCell,
  ListPageDataTableHeader,
  ListPageDataTableHeaderCell,
  ListPageDataTableHeaderRow,
  ListPageDataTableRow,
} from "@/features/app-shell/components/page-layout";
import { OhExamBatteryRuleDialog, type OhRuleDraft } from "@/features/occupational-health/components/compliance/OhExamBatteryRuleDialog";
import { OhConfirmDialog } from "@/features/occupational-health/components/dashboard/OhConfirmDialog";
import { OhPanel, OhPanelState } from "@/features/occupational-health/components/dashboard/OhPanel";
import { OH_STICKY_TABLE } from "@/features/occupational-health/components/dashboard/oh-flat";
import { OhSegmented } from "@/features/occupational-health/components/dashboard/OhSegmented";
import {
  createOhExamBatteryRule,
  fetchOhExamBatteryRules,
  fetchOhHazardProfiles,
  runOhSurveillanceSchedule,
  updateOhExamBatteryRule,
} from "@/features/occupational-health/services/oh.service";
import type { OhExamBatteryRule } from "@/features/occupational-health/types";
import { EXAM_TYPES } from "@/features/occupational-health/utils/oh-labels";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

type View = "all" | "active" | "inactive";

/**
 * Exam battery rules drive surveillance: each active rule creates a due requirement for every
 * worker on the hazard profile, repeating every N months. Requirements are generated nightly;
 * "Generate now" runs the same job immediately (after confirming).
 */
export function OhExamBatteryRulesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rulesQuery = useQuery({ queryKey: ["oh-exam-battery-rules"], queryFn: fetchOhExamBatteryRules });
  const profilesQuery = useQuery({ queryKey: ["oh-hazard-profiles", "all"], queryFn: () => fetchOhHazardProfiles() });
  const profiles = profilesQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const [view, setView] = useState<View>("all");
  const [editing, setEditing] = useState<OhExamBatteryRule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deactivate, setDeactivate] = useState<OhExamBatteryRule | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [busy, setBusy] = useState<"save" | "toggle" | "generate" | null>(null);

  const profileName = (id: number | null) => profiles.find((p) => p.id === id)?.name ?? "Hazard rule";
  const examLabel = (v: string) => EXAM_TYPES.find((t) => t.value === v)?.label ?? v;
  const visible = rules.filter((r) => (view === "all" ? true : view === "active" ? r.is_active : !r.is_active));

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["oh-exam-battery-rules"] }),
      queryClient.invalidateQueries({ queryKey: ["oh-compliance-dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["oh-compliance-insights"] }),
    ]);
  }

  const fail = (title: string, error: unknown) =>
    toast({ title, description: error instanceof Error ? error.message : undefined, variant: "error" });

  async function handleSave(draft: OhRuleDraft) {
    setBusy("save");
    try {
      if (editing) {
        await updateOhExamBatteryRule(editing.uuid, { periodicity_months: draft.periodicity_months, is_active: draft.is_active });
        toast({ variant: "success", title: "Rule updated" });
      } else {
        await createOhExamBatteryRule({
          component_code: draft.component_code,
          exam_type: draft.exam_type,
          periodicity_months: draft.periodicity_months,
          hazard_profile: draft.hazard_profile,
        });
        toast({ variant: "success", title: "Rule added" });
      }
      setDialogOpen(false);
      setEditing(null);
      await refresh();
    } catch (error) {
      fail(editing ? "Could not update rule" : "Could not add rule", error);
    } finally {
      setBusy(null);
    }
  }

  async function setActive(rule: OhExamBatteryRule, isActive: boolean) {
    setBusy("toggle");
    try {
      await updateOhExamBatteryRule(rule.uuid, { is_active: isActive });
      setDeactivate(null);
      await refresh();
    } catch (error) {
      fail("Could not update rule", error);
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerate() {
    setBusy("generate");
    try {
      const result = await runOhSurveillanceSchedule();
      toast({
        variant: "success",
        title: "Surveillance updated",
        description: `${result.created} created, ${result.completed} completed, ${result.overdue} now overdue.`,
      });
      setGenerateOpen(false);
      await refresh();
    } catch (error) {
      fail("Could not generate requirements", error);
    } finally {
      setBusy(null);
    }
  }

  return (
    <OhPanel
      id="oh-exam-battery-rules"
      title="Exam battery rules"
      description="Each active rule creates a due requirement for every worker on the hazard profile."
      actions={
        <>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setGenerateOpen(true)}>
            <Wand2 className="size-3.5" aria-hidden /> Generate now
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-3.5" aria-hidden /> New rule
          </Button>
        </>
      }
      data-testid="oh-exam-battery-rules"
    >
      <div className="pb-3">
        <OhSegmented
          label="Rule status"
          value={view}
          onChange={setView}
          options={[
            { value: "all", label: "All", count: rules.length },
            { value: "active", label: "Active", count: rules.filter((r) => r.is_active).length },
            { value: "inactive", label: "Inactive", count: rules.filter((r) => !r.is_active).length },
          ]}
        />
      </div>
      <div>
        <OhPanelState
          isLoading={rulesQuery.isLoading}
          error={rulesQuery.error}
          onRetry={() => void rulesQuery.refetch()}
          isEmpty={visible.length === 0}
          emptyText={rules.length === 0 ? "No rules yet. Add one to start generating surveillance." : "No rules in this view."}
          height={140}
        >
          <ListPageDataTable className={OH_STICKY_TABLE}>
            <ListPageDataTableHeader>
              <ListPageDataTableHeaderRow>
                <ListPageDataTableHeaderCell>Component</ListPageDataTableHeaderCell>
                <ListPageDataTableHeaderCell>Exam type</ListPageDataTableHeaderCell>
                <ListPageDataTableHeaderCell>Frequency</ListPageDataTableHeaderCell>
                <ListPageDataTableHeaderCell className="hidden sm:table-cell">Hazard profile</ListPageDataTableHeaderCell>
                <ListPageDataTableHeaderCell>Active</ListPageDataTableHeaderCell>
                <ListPageDataTableHeaderCell className="text-right">
                  <span className="sr-only">Edit</span>
                </ListPageDataTableHeaderCell>
              </ListPageDataTableHeaderRow>
            </ListPageDataTableHeader>
            <ListPageDataTableBody>
              {visible.map((rule) => (
                <ListPageDataTableRow key={rule.uuid} className={cn(!rule.is_active && "text-dash-muted")}>
                  <ListPageDataTableCell>
                    <span className={cn("font-medium", rule.is_active ? "text-brand-navy" : "text-dash-muted line-through")}>
                      {rule.component_code}
                    </span>
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>{examLabel(rule.exam_type)}</ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <Badge variant="outline">{rule.periodicity_months ? `every ${rule.periodicity_months} months` : "once"}</Badge>
                  </ListPageDataTableCell>
                  <ListPageDataTableCell className="hidden sm:table-cell">{profileName(rule.hazard_profile_id)}</ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <Switch
                      checked={rule.is_active}
                      disabled={busy === "toggle"}
                      aria-label={`${rule.is_active ? "Deactivate" : "Activate"} ${rule.component_code}`}
                      onCheckedChange={(next) => (next ? void setActive(rule, true) : setDeactivate(rule))}
                    />
                  </ListPageDataTableCell>
                  <ListPageDataTableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      aria-label={`Edit ${rule.component_code}`}
                      onClick={() => {
                        setEditing(rule);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-3" aria-hidden /> <span className="hidden sm:inline">Edit</span>
                    </Button>
                  </ListPageDataTableCell>
                </ListPageDataTableRow>
              ))}
            </ListPageDataTableBody>
          </ListPageDataTable>
        </OhPanelState>
      </div>

      <OhExamBatteryRuleDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        rule={editing}
        profiles={profiles}
        isSaving={busy === "save"}
        onSave={(draft) => void handleSave(draft)}
      />
      <OhConfirmDialog
        open={deactivate !== null}
        onOpenChange={(open) => (!open ? setDeactivate(null) : undefined)}
        title={`Deactivate ${deactivate?.component_code ?? "rule"}?`}
        description="No new requirements will be created from this rule. Requirements that are already open stay on the worklist."
        confirmLabel="Deactivate"
        tone="destructive"
        isPending={busy === "toggle"}
        onConfirm={() => deactivate && void setActive(deactivate, false)}
        data-testid="oh-rule-deactivate-dialog"
      />
      <OhConfirmDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        title="Generate requirements now?"
        description="Runs the nightly job immediately: creates requirements from active rules, closes ones a completed exam covers and marks late ones overdue."
        confirmLabel="Generate"
        pendingLabel="Generating…"
        isPending={busy === "generate"}
        onConfirm={() => void handleGenerate()}
        data-testid="oh-generate-dialog"
      />
    </OhPanel>
  );
}
