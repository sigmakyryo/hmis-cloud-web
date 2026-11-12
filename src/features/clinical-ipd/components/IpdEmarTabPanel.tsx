"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchIpdEmar,
  fetchIpdStays,
  recordIpdEmar,
} from "@/features/clinical-ipd/services/clinical-ipd.service";
import { fetchPrescriptions } from "@/features/clinical-opd/services/clinical-opd.service";
import type { ClinicalWorkspacePanelProps } from "@/features/clinical-workspace/types/clinical-workspace.types";

const ADMIN_STATUSES = ["given", "refused", "held", "missed"] as const;

export function IpdEmarTabPanel({
  visitUuid,
  encounterUuid,
}: ClinicalWorkspacePanelProps) {
  const queryClient = useQueryClient();
  const [selectedRx, setSelectedRx] = useState("");
  const [status, setStatus] =
    useState<(typeof ADMIN_STATUSES)[number]>("given");
  const [dose, setDose] = useState("");
  const [notes, setNotes] = useState("");

  const stayQuery = useQuery({
    queryKey: ["ipd-stay-for-visit", visitUuid],
    queryFn: async () => {
      const stays = await fetchIpdStays({ status: "active", visit: visitUuid });
      return stays[0] ?? null;
    },
  });

  const emarQuery = useQuery({
    queryKey: ["ipd-emar", stayQuery.data?.uuid],
    enabled: Boolean(stayQuery.data?.uuid),
    queryFn: () => fetchIpdEmar(stayQuery.data!.uuid),
  });

  const prescriptionsQuery = useQuery({
    queryKey: ["encounter-prescriptions", visitUuid, encounterUuid],
    queryFn: () => fetchPrescriptions(visitUuid, encounterUuid),
    enabled: Boolean(stayQuery.data?.uuid),
  });

  const openPrescriptions = (prescriptionsQuery.data ?? []).filter(
    (rx) => rx.status !== "cancelled" && rx.status !== "discontinued",
  );

  const recordMutation = useMutation({
    mutationFn: () =>
      recordIpdEmar({
        stay: stayQuery.data!.uuid,
        prescription: selectedRx,
        status,
        dose_given: dose.trim(),
        notes: notes.trim(),
      }),
    onSuccess: () => {
      setSelectedRx("");
      setDose("");
      setNotes("");
      void queryClient.invalidateQueries({
        queryKey: ["ipd-emar", stayQuery.data?.uuid],
      });
    },
  });

  if (stayQuery.isLoading || emarQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading eMAR…</p>;
  }
  if (!stayQuery.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Admit the patient before recording administrations.
      </p>
    );
  }

  const rows = emarQuery.data ?? [];

  return (
    <div className="space-y-6">
      <section className="max-w-xl space-y-3">
        <h2 className="text-sm font-medium">Record administration</h2>
        <div className="space-y-1.5">
          <Label htmlFor="emar-rx">Open prescription</Label>
          <select
            id="emar-rx"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedRx}
            onChange={(event) => setSelectedRx(event.target.value)}
          >
            <option value="">Select medication</option>
            {openPrescriptions.map((rx) => (
              <option key={rx.uuid} value={rx.uuid}>
                {rx.product_name || "Medication"}
                {rx.dose ? ` · ${rx.dose}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emar-status">Status</Label>
          <select
            id="emar-status"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as (typeof ADMIN_STATUSES)[number])
            }
          >
            {ADMIN_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emar-dose">Dose given</Label>
          <Input
            id="emar-dose"
            value={dose}
            onChange={(event) => setDose(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emar-notes">Notes</Label>
          <Textarea
            id="emar-notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        {recordMutation.error ? (
          <p className="text-sm text-destructive">
            {recordMutation.error instanceof Error
              ? recordMutation.error.message
              : "Could not record administration."}
          </p>
        ) : null}
        <Button
          type="button"
          disabled={!selectedRx || recordMutation.isPending}
          onClick={() => recordMutation.mutate()}
        >
          Record administration
        </Button>
      </section>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No medication administrations recorded yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.uuid}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 text-sm"
            >
              <div>
                <p className="font-medium">{row.product_name}</p>
                <p className="text-muted-foreground">
                  {new Date(row.administered_at).toLocaleString()}
                  {row.dose_given ? ` · ${row.dose_given}` : ""}
                </p>
              </div>
              <StatusDotBadge tone="neutral">{row.status}</StatusDotBadge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
