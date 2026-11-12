"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMyClinicalCapabilities } from "@/features/clinical-opd/hooks/use-clinical-opd";
import { useTheatreRooms } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import {
  useTheatreFamilyBoard,
  useTheatreFamilyCode,
} from "@/features/clinical-theatre/hooks/use-theatre-p4";
import type {
  TheatreFamilyCode,
  TheatreStaffFamilyEntry,
} from "@/features/clinical-theatre/types/theatre-p4.types";
import { FAMILY_STAGE_STYLES } from "@/features/clinical-theatre/utils/theatre-p4-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

/** Printable card with the family's tracking code (no clinical details). */
export function TheatreTrackingCard({
  entry,
  code,
  onClose,
}: {
  entry: TheatreStaffFamilyEntry;
  code: TheatreFamilyCode;
  onClose: () => void;
}) {
  return (
    <div
      className="rounded-lg border-2 border-dashed border-brand-navy p-6 text-center print:border-black"
      data-testid="theatre-tracking-card"
    >
      <p className="text-sm uppercase tracking-wide text-muted-foreground">{code.title}</p>
      <p className="mt-2 text-sm">Your patient code</p>
      <p className="my-3 font-mono text-5xl font-bold tracking-widest">{code.display_code}</p>
      <p className="text-sm text-muted-foreground">
        Look for this code on the waiting-area screen to follow progress:
        checked in, pre-op, in theatre, in recovery, ready.
      </p>
      {code.code_mode === "tracking_code" ? null : (
        <p className="mt-2 text-xs text-muted-foreground">Tracking code: {code.tracking_code}</p>
      )}
      <p className="mt-4 text-xs text-muted-foreground print:hidden">
        For {entry.patient_name}. Hand this card only to the patient&apos;s family or escort.
      </p>
      <div className="mt-4 flex justify-center gap-2 print:hidden">
        <Button size="sm" onClick={() => window.print()}>
          Print
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

/** Staff view of the family status board, with names to help families. */
export function TheatreFamilyBoardPage() {
  const { data: capabilityData, isLoading: loadingCaps } = useMyClinicalCapabilities();
  const capabilities = capabilityData?.capabilities ?? [];
  const allowed = capabilities.includes("view_theatre_family_board");
  const canManage = capabilities.includes("manage_theatre_family_board");
  const [room, setRoom] = useState("");
  const { data: rooms = [] } = useTheatreRooms({}, { enabled: allowed });
  const board = useTheatreFamilyBoard(room ? { room } : {}, allowed);
  const familyCode = useTheatreFamilyCode();
  const [card, setCard] = useState<{ entry: TheatreStaffFamilyEntry; code: TheatreFamilyCode } | null>(
    null,
  );

  if (!loadingCaps && !allowed) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          You do not have permission to view the family status board.
        </p>
      </div>
    );
  }

  const openCard = (entry: TheatreStaffFamilyEntry, regenerate = false) =>
    familyCode.mutate(
      { caseUuid: entry.case_uuid, regenerate },
      { onSuccess: (code) => setCard({ entry, code }) },
    );

  const entries = board.data?.entries ?? [];

  return (
    <div className="space-y-4 p-4" data-testid="theatre-family-board-page">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-brand-navy">
            {board.data?.title || "Family status board"}
          </h1>
          <p className="text-sm text-muted-foreground">
            What families see on the waiting-area screen (code and stage only), with patient
            details for staff. Refreshes every 30 seconds.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="family-board-room">Room</Label>
          <select
            id="family-board-room"
            className={SELECT_CLASS}
            value={room}
            onChange={(event) => setRoom(event.target.value)}
          >
            <option value="">All rooms</option>
            {rooms.map((option) => (
              <option key={option.uuid} value={option.uuid}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {card ? (
        <TheatreTrackingCard entry={card.entry} code={card.code} onClose={() => setCard(null)} />
      ) : null}
      {familyCode.error ? (
        <p className="text-sm text-red-600">{errorMessage(familyCode.error, "Could not get the code.")}</p>
      ) : null}

      <div className="print:hidden">
        {board.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading board…</p>
        ) : board.error ? (
          <p className="text-sm text-red-600">{errorMessage(board.error, "Could not load the board.")}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No patients on the board right now.</p>
        ) : (
          <table className="w-full text-sm" data-testid="theatre-family-board-table">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">Board code</th>
                <th className="py-1 pr-3">Stage</th>
                <th className="py-1 pr-3">Patient</th>
                <th className="py-1 pr-3">Number</th>
                <th className="py-1 pr-3">Room</th>
                <th className="py-1 pr-3">Tracking card</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.case_uuid} className="border-t">
                  <td className="py-2 pr-3 font-mono text-base font-semibold">{entry.code}</td>
                  <td className="py-2 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FAMILY_STAGE_STYLES[entry.stage]}`}>
                      {entry.stage_label}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{entry.patient_name}</td>
                  <td className="py-2 pr-3">{entry.patient_identifier || "—"}</td>
                  <td className="py-2 pr-3">{entry.room_name || "—"}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={familyCode.isPending}
                        onClick={() => openCard(entry)}
                      >
                        Show / print
                      </Button>
                      {canManage && entry.tracking_code ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={familyCode.isPending}
                          onClick={() => openCard(entry, true)}
                        >
                          New code
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
