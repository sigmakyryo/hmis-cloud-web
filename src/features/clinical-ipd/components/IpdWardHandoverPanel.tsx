"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createIpdHandover,
  fetchIpdHandovers,
  fetchIpdWardPatients,
} from "@/features/clinical-ipd/services/clinical-ipd.service";
import { ROUTES } from "@/constants/routes";
import Link from "next/link";

type IpdWardHandoverPanelProps = {
  wardUuid: string;
  wardName: string;
};

export function IpdWardHandoverPanel({
  wardUuid,
  wardName,
}: IpdWardHandoverPanelProps) {
  const queryClient = useQueryClient();
  const [shift, setShift] = useState<"morning" | "afternoon" | "night">(
    "morning",
  );
  const [summary, setSummary] = useState("");
  const [tasks, setTasks] = useState("");
  const [alerts, setAlerts] = useState("");

  const patientsQuery = useQuery({
    queryKey: ["ipd-ward-patients", wardUuid],
    queryFn: () => fetchIpdWardPatients(wardUuid),
  });
  const handoversQuery = useQuery({
    queryKey: ["ipd-handovers", wardUuid],
    queryFn: () => fetchIpdHandovers({ ward: wardUuid }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createIpdHandover({
        ward: wardUuid,
        shift,
        summary: summary.trim(),
        outstanding_tasks: tasks.trim(),
        alerts: alerts.trim(),
      }),
    onSuccess: () => {
      setSummary("");
      setTasks("");
      setAlerts("");
      void queryClient.invalidateQueries({
        queryKey: ["ipd-handovers", wardUuid],
      });
    },
  });

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-brand-navy">Handover · {wardName}</h2>
        <p className="mt-0.5 text-[13px] text-dash-muted">Active patients and shift notes for this ward.</p>
      </div>

      <div>
        <h3 className="mb-2 text-[13px] font-medium text-brand-navy">Patients ({patientsQuery.data?.length ?? 0})</h3>
        <ul className="space-y-2 text-sm">
          {(patientsQuery.data ?? []).map((row) => (
            <li key={row.stay_uuid} className="flex items-baseline justify-between gap-3 border-b border-dash-border/70 py-2 text-[13.5px]">
              <span className="text-brand-navy">
                {row.customer.display_name}
                {row.bed_code ? ` · ${row.bed_code}` : ""}
                <span className="text-dash-muted"> · {row.hours_since_admission}h</span>
              </span>
              <Link
                href={ROUTES.clinicalIpdEncounter(row.visit_uuid, row.encounter_uuid)}
                className="shrink-0 font-semibold text-brand-primary hover:underline"
              >
                Open
              </Link>
            </li>
          ))}
          {!patientsQuery.isLoading && (patientsQuery.data?.length ?? 0) === 0 ? (
            <li className="py-2 text-[13px] text-dash-muted">No active patients.</li>
          ) : null}
        </ul>
      </div>

      <div className="max-w-xl space-y-3">
        <h3 className="text-[13px] font-medium text-brand-navy">New handover</h3>
        <div className="space-y-1.5">
          <Label htmlFor="handover-shift">Shift</Label>
          <div className="flex gap-2" role="group" aria-label="Shift">
            {(["morning", "afternoon", "night"] as const).map((value) => (
              <button
                key={value}
                type="button"
                id={value === "morning" ? "handover-shift" : undefined}
                aria-pressed={shift === value}
                onClick={() => setShift(value)}
                className={
                  shift === value
                    ? "h-8 rounded-lg bg-brand-tint px-3 text-[13px] font-semibold text-brand-primary"
                    : "h-8 rounded-lg px-3 text-[13px] font-medium text-dash-muted hover:bg-dash-canvas hover:text-brand-navy"
                }
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          rows={3}
          placeholder="Summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
        <Textarea
          rows={2}
          placeholder="Outstanding tasks"
          value={tasks}
          onChange={(event) => setTasks(event.target.value)}
        />
        <Textarea
          rows={2}
          placeholder="Alerts"
          value={alerts}
          onChange={(event) => setAlerts(event.target.value)}
        />
        {createMutation.error ? (
          <p className="text-sm text-destructive">
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : "Could not save handover."}
          </p>
        ) : null}
        <Button
          type="button"
          disabled={!summary.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          Save handover
        </Button>
      </div>

      <div>
        <h3 className="mb-2 text-[13px] font-medium text-brand-navy">Recent handovers</h3>
        <ul className="space-y-3 text-sm">
          {(handoversQuery.data ?? []).slice(0, 5).map((row) => (
            <li key={row.uuid} className="border-b border-dash-border/70 py-2.5 text-[13.5px]">
              <p className="font-medium text-brand-navy capitalize">
                {row.shift} · {new Date(row.handed_over_at).toLocaleString()}
              </p>
              <p className="mt-0.5 text-brand-slate">{row.summary}</p>
              {row.outstanding_tasks ? <p className="mt-0.5 text-dash-muted">Tasks: {row.outstanding_tasks}</p> : null}
              {row.alerts ? <p className="mt-0.5 text-amber-800">Alerts: {row.alerts}</p> : null}
            </li>
          ))}
          {!handoversQuery.isLoading &&
          (handoversQuery.data?.length ?? 0) === 0 ? (
            <li className="py-2 text-[13px] text-dash-muted">No handovers yet.</li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
