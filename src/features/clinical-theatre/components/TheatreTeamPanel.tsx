"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CareProviderCombobox } from "@/features/appointments/components/CareProviderCombobox";
import type { CareProvider } from "@/features/appointments/types/appointment.types";
import {
  useAddTheatreTeamMember,
  useRemoveTheatreTeamMember,
  useTheatreTeam,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import {
  THEATRE_TEAM_ROLES,
  type TheatreCase,
  type TheatreTeamRole,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import { THEATRE_TEAM_ROLE_LABELS } from "@/features/clinical-theatre/utils/theatre-safety-display";

const CLOSED_STATUSES = new Set(["discharged_ward", "discharged_home", "cancelled"]);

function errorText(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Surgical team of a case: who is on it and in which role. */
export function TheatreTeamPanel({ theatreCase }: { theatreCase: TheatreCase }) {
  const { data: members = [], isLoading } = useTheatreTeam(theatreCase.uuid);
  const add = useAddTheatreTeamMember();
  const remove = useRemoveTheatreTeamMember();
  const [provider, setProvider] = useState<CareProvider | null>(null);
  const [role, setRole] = useState<TheatreTeamRole>("surgeon");
  const [notes, setNotes] = useState("");
  const locked = CLOSED_STATUSES.has(theatreCase.status);
  const error = errorText(add.error) ?? errorText(remove.error);

  const submit = () => {
    if (!provider) return;
    add.mutate(
      {
        caseUuid: theatreCase.uuid,
        payload: { user: provider.id, role, notes: notes.trim() },
      },
      {
        onSuccess: () => {
          setProvider(null);
          setNotes("");
        },
      },
    );
  };

  return (
    <section className="space-y-4" data-testid="theatre-team-panel">
      <h3 className="text-base font-semibold text-brand-navy">Surgical team</h3>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading team…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one is on the team yet.</p>
      ) : (
        <ul className="divide-y divide-dash-border/70 border-y border-dash-border/70">
          {members.map((member) => (
            <li
              key={member.uuid}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{member.user_name}</p>
                <p className="text-muted-foreground">
                  {member.role_label}
                  {member.notes ? ` · ${member.notes}` : ""}
                </p>
              </div>
              {locked ? null : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate({
                      caseUuid: theatreCase.uuid,
                      memberUuid: member.uuid,
                    })
                  }
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {locked ? null : (
        <div className="grid gap-3 rounded-lg bg-muted/40 p-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
          <CareProviderCombobox
            id="theatre-team-member"
            label="Team member"
            clinicUuid={theatreCase.clinic_uuid}
            value={provider?.id ?? null}
            displayName={provider?.name ?? null}
            onSelect={setProvider}
          />
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as TheatreTeamRole)}>
              <SelectTrigger aria-label="Team role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEATRE_TEAM_ROLES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {THEATRE_TEAM_ROLE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="theatre-team-notes">Notes</Label>
            <Input
              id="theatre-team-notes"
              value={notes}
              maxLength={255}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <Button disabled={!provider || add.isPending} onClick={submit}>
            Add
          </Button>
        </div>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
