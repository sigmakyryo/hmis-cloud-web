"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createIpdRound,
  fetchIpdRounds,
  fetchIpdStays,
} from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { ClinicalWorkspacePanelProps } from "@/features/clinical-workspace/types/clinical-workspace.types";

export function IpdRoundsTabPanel({ visitUuid }: ClinicalWorkspacePanelProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState("");

  const stayQuery = useQuery({
    queryKey: ["ipd-stay-for-visit", visitUuid],
    queryFn: async () => {
      const stays = await fetchIpdStays({ status: "active" });
      return stays.find((stay) => stay.visit_uuid === visitUuid) ?? null;
    },
  });

  const roundsQuery = useQuery({
    queryKey: ["ipd-rounds", stayQuery.data?.uuid],
    enabled: Boolean(stayQuery.data?.uuid),
    queryFn: () => fetchIpdRounds(stayQuery.data!.uuid),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createIpdRound({
        stay: stayQuery.data!.uuid,
        notes,
        plan,
        charge: true,
      }),
    onSuccess: () => {
      setNotes("");
      setPlan("");
      void queryClient.invalidateQueries({
        queryKey: ["ipd-rounds", stayQuery.data?.uuid],
      });
    },
  });

  if (!stayQuery.data) {
    return (
      <p className="text-sm text-muted-foreground">
        No active stay for ward rounds.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <Textarea
          placeholder="Round notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <Textarea
          placeholder="Plan"
          value={plan}
          onChange={(event) => setPlan(event.target.value)}
        />
        <Button type="submit" disabled={createMutation.isPending}>
          Record round
        </Button>
      </form>
      <ul className="space-y-3">
        {(roundsQuery.data ?? []).map((row) => (
          <li key={row.uuid} className="border-b border-border/60 pb-3 text-sm">
            <p className="font-medium">
              {new Date(row.rounded_at).toLocaleString()}
              {row.is_bed_day_charge ? " · Bed-day" : ""}
            </p>
            <p className="text-muted-foreground">{row.clinician_name}</p>
            {row.notes ? <p className="mt-1">{row.notes}</p> : null}
            {row.plan ? <p className="mt-1 text-muted-foreground">{row.plan}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
