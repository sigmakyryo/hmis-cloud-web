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
    <section className="space-y-4 rounded-md border border-border/70 p-4">
      <div>
        <h2 className="text-sm font-medium">Ward handover · {wardName}</h2>
        <p className="text-xs text-muted-foreground">
          Active patients and shift notes for this ward.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Patients ({patientsQuery.data?.length ?? 0})
        </h3>
        <ul className="space-y-2 text-sm">
          {(patientsQuery.data ?? []).map((row) => (
            <li key={row.stay_uuid} className="flex justify-between gap-2">
              <span>
                {row.customer.display_name}
                {row.bed_code ? ` · ${row.bed_code}` : ""}
                <span className="text-muted-foreground">
                  {" "}
                  · {row.hours_since_admission}h
                </span>
              </span>
              <Link
                href={ROUTES.clinicalIpdEncounter(
                  row.visit_uuid,
                  row.encounter_uuid,
                )}
                className="underline"
              >
                Open
              </Link>
            </li>
          ))}
          {!patientsQuery.isLoading && (patientsQuery.data?.length ?? 0) === 0 ? (
            <li className="text-muted-foreground">No active patients.</li>
          ) : null}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          New handover
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor="handover-shift">Shift</Label>
          <select
            id="handover-shift"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={shift}
            onChange={(event) =>
              setShift(event.target.value as "morning" | "afternoon" | "night")
            }
          >
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="night">Night</option>
          </select>
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
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent handovers
        </h3>
        <ul className="space-y-3 text-sm">
          {(handoversQuery.data ?? []).slice(0, 5).map((row) => (
            <li key={row.uuid} className="border-b border-border/50 pb-2">
              <p className="font-medium capitalize">
                {row.shift} · {new Date(row.handed_over_at).toLocaleString()}
              </p>
              <p>{row.summary}</p>
              {row.outstanding_tasks ? (
                <p className="text-muted-foreground">
                  Tasks: {row.outstanding_tasks}
                </p>
              ) : null}
              {row.alerts ? (
                <p className="text-amber-700 dark:text-amber-400">
                  Alerts: {row.alerts}
                </p>
              ) : null}
            </li>
          ))}
          {!handoversQuery.isLoading &&
          (handoversQuery.data?.length ?? 0) === 0 ? (
            <li className="text-muted-foreground">No handovers yet.</li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
