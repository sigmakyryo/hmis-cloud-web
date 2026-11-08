"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import {
  createIpdTheatre,
  fetchIpdStays,
  fetchIpdTheatre,
} from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { ClinicalWorkspacePanelProps } from "@/features/clinical-workspace/types/clinical-workspace.types";

export function IpdTheatreTabPanel({ visitUuid }: ClinicalWorkspacePanelProps) {
  const queryClient = useQueryClient();
  const [theatreName, setTheatreName] = useState("OT-1");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");

  const stayQuery = useQuery({
    queryKey: ["ipd-stay-for-visit", visitUuid],
    queryFn: async () => {
      const stays = await fetchIpdStays({ status: "active" });
      return stays.find((stay) => stay.visit_uuid === visitUuid) ?? null;
    },
  });

  const theatreQuery = useQuery({
    queryKey: ["ipd-theatre", stayQuery.data?.uuid],
    enabled: Boolean(stayQuery.data?.uuid),
    queryFn: () => fetchIpdTheatre(stayQuery.data!.uuid),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createIpdTheatre({
        stay: stayQuery.data!.uuid,
        theatre_name: theatreName,
        scheduled_start: start,
        procedure_description: description,
      }),
    onSuccess: () => {
      setDescription("");
      void queryClient.invalidateQueries({
        queryKey: ["ipd-theatre", stayQuery.data?.uuid],
      });
    },
  });

  if (!stayQuery.data) {
    return (
      <p className="text-sm text-muted-foreground">
        No active stay for theatre booking.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <Input
          placeholder="Theatre name"
          value={theatreName}
          onChange={(event) => setTheatreName(event.target.value)}
          required
        />
        <Input
          type="datetime-local"
          value={start}
          onChange={(event) => setStart(event.target.value)}
          required
        />
        <Input
          className="sm:col-span-2"
          placeholder="Procedure description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Button type="submit" disabled={createMutation.isPending}>
          Book theatre
        </Button>
      </form>
      <ul className="space-y-3">
        {(theatreQuery.data ?? []).map((row) => (
          <li
            key={row.uuid}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 text-sm"
          >
            <div>
              <p className="font-medium">{row.theatre_name}</p>
              <p className="text-muted-foreground">
                {new Date(row.scheduled_start).toLocaleString()}
              </p>
              {row.procedure_description ? (
                <p className="mt-1">{row.procedure_description}</p>
              ) : null}
            </div>
            <StatusDotBadge tone="neutral">{row.status}</StatusDotBadge>
          </li>
        ))}
      </ul>
    </div>
  );
}
