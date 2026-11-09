"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";
import { QuietLoading } from "../shared/QuietLoading";
import { EmptyAction } from "../shared/EmptyAction";
import { STATUS_LABEL } from "../shared/status-label";
import {
  type OhImmStatus,
  fetchOhImmDueFiltered,
  fetchOhImmExposureDueFollowups,
  fetchOhImmFitTestsDue,
  remindOhImm,
} from "@/features/occupational-health/services/immunisation.service";

export function DueWorklist({
  rows,
  loading,
}: {
  rows: OhImmStatus[];
  loading: boolean;
}) {
  const expFollowups = useQuery({
    queryKey: ["oh-imm-exp-followups-due"],
    queryFn: () => fetchOhImmExposureDueFollowups(14),
  });
  const fitDueInDue = useQuery({
    queryKey: ["oh-imm-fit-due-in-due"],
    queryFn: () => fetchOhImmFitTestsDue(30),
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [employer, setEmployer] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");

  const filteredQuery = useQuery({
    queryKey: ["oh-imm-due-filtered", employer, department, status],
    queryFn: () =>
      fetchOhImmDueFiltered(30, {
        employer,
        department,
        status,
      }),
  });
  const list = filteredQuery.data ?? rows;

  const remind = useMutation({
    mutationFn: () => remindOhImm(selected, "email"),
    onSuccess: (result) => {
      const skipped = result.filter((r) => r.status === "skipped_unconfigured").length;
      toast({
        variant: "success",
        title: "Reminders queued",
        description:
          skipped > 0
            ? `${result.length} queued · ${skipped} skipped (mail not configured).`
            : `${result.length} reminder(s) processed.`,
      });
      setSelected([]);
      void queryClient.invalidateQueries({ queryKey: ["oh-imm-due"] });
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not remind",
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });

  if (loading && filteredQuery.isLoading) return <QuietLoading />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-[12px]">Employer</Label>
          <Input
            className="h-8 w-40"
            value={employer}
            onChange={(e) => setEmployer(e.target.value)}
            placeholder="Filter"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Department</Label>
          <Input
            className="h-8 w-40"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Filter"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Status</Label>
          <select
            className="h-8 rounded-md border border-dash-border bg-white px-2 text-[13px]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Any</option>
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
            <option value="non_responder">Non-responder</option>
          </select>
        </div>
        <PrimaryButton
          type="button"
          disabled={selected.length === 0 || remind.isPending}
          onClick={() => remind.mutate()}
        >
          Remind selected ({selected.length})
        </PrimaryButton>
      </div>

      {(fitDueInDue?.data ?? []).length > 0 ? (
        <div className="mt-4 space-y-1" data-testid="oh-imm-fit-due-panel">
          <h3 className="text-sm font-semibold text-primary">Fit-tests due</h3>
          <ul className="text-sm">
            {(fitDueInDue.data ?? []).map((f) => (
              <li key={String(f.uuid)} className="border-b border-border/60 py-1">
                {String(f.customer_uuid).slice(0, 8)} · expires {String(f.expires_on)} · {String(f.status)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {(expFollowups.data ?? []).length > 0 ? (
        <div className="mt-4 space-y-1">
          <h3 className="text-sm font-semibold text-primary">Exposure follow-ups</h3>
          <ul className="text-sm">
            {(expFollowups.data ?? []).map((f) => (
              <li key={String(f.uuid)} className="border-b border-border/60 py-1">
                {String(f.customer_initials)} · {String(f.label)} · due {String(f.due_date)} · {String(f.status)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {list.length === 0 ? (
        <EmptyAction
          title="Nobody matches"
          description="Adjust filters or wait until doses fall due."
        />
      ) : (
        <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
          {list.map((row) => {
            const id = row.uuid;
            const checked = selected.includes(id);
            return (
              <li
                key={`${row.customer_uuid}-${row.vaccine_code}-${id}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setSelected((prev) =>
                      checked ? prev.filter((x) => x !== id) : [...prev, id],
                    )
                  }
                  aria-label={`Select ${row.vaccine_code}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-brand-navy">
                    {row.vaccine_name ?? row.vaccine_code}
                  </p>
                  <p className="text-[13px] text-dash-muted">
                    {STATUS_LABEL[row.status] ?? row.status}
                    {row.next_due_date ? ` · due ${row.next_due_date}` : ""}
                    {row.doses_required != null
                      ? ` · ${row.doses_received}/${row.doses_required} doses`
                      : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[12px] font-medium",
                    row.status === "overdue"
                      ? "bg-red-50 text-red-700"
                      : row.status === "due"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-dash-tint text-dash-muted",
                  )}
                >
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

