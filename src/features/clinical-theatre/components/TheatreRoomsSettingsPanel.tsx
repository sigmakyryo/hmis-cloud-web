"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { IpdClinicSelect } from "@/features/clinical-ipd/components/IpdClinicSelect";
import {
  fetchClinicalClinics,
  fetchClinicalDepartments,
} from "@/features/clinical/services/clinical-catalog.service";
import type { ClinicalClinic } from "@/features/clinical/types/clinical-catalog.types";
import {
  useCreateTheatreRoom,
  useTheatreRooms,
  useUpdateTheatreRoom,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type { TheatreRoomKind } from "@/features/clinical-theatre/types/clinical-theatre.types";

const ROOM_KINDS: Array<{ value: TheatreRoomKind; label: string }> = [
  { value: "major", label: "Major theatre" },
  { value: "minor", label: "Minor theatre" },
  { value: "endoscopy", label: "Endoscopy" },
];

/** Settings → Theatre → Rooms: operating rooms are Locations on a theatre department. */
export function TheatreRoomsSettingsPanel() {
  const [pickedClinic, setClinic] = useState<ClinicalClinic | null>(null);
  const [pickedDepartmentUuid, setDepartmentUuid] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<TheatreRoomKind>("major");

  const clinicsQuery = useQuery({
    queryKey: ["clinical-clinics"],
    queryFn: fetchClinicalClinics,
  });
  // Why: default to the first clinic until the user picks one.
  const clinic = pickedClinic ?? clinicsQuery.data?.[0] ?? null;

  const departmentsQuery = useQuery({
    queryKey: ["theatre-departments", clinic?.id],
    queryFn: async () => {
      const departments = await fetchClinicalDepartments(clinic?.id);
      return departments.filter((item) => item.department_type === "theatre");
    },
    enabled: Boolean(clinic?.id),
  });
  const departments = useMemo(
    () => departmentsQuery.data ?? [],
    [departmentsQuery.data],
  );
  const departmentUuid = departments.some(
    (department) => department.uuid === pickedDepartmentUuid,
  )
    ? pickedDepartmentUuid
    : (departments[0]?.uuid ?? "");

  const roomsQuery = useTheatreRooms(
    { clinic: clinic?.uuid, include_inactive: true },
    { enabled: Boolean(clinic?.uuid) },
  );
  const createRoom = useCreateTheatreRoom();
  const updateRoom = useUpdateTheatreRoom();
  const error = createRoom.error ?? updateRoom.error;

  return (
    <div className="space-y-6" data-testid="theatre-rooms-settings">
      <IpdClinicSelect
        clinics={clinicsQuery.data ?? []}
        value={clinic}
        onChange={setClinic}
        isLoading={clinicsQuery.isLoading}
      />

      {clinic && !departmentsQuery.isLoading && departments.length === 0 ? (
        <p className="text-sm text-brand-muted">
          This clinic has no theatre department yet. Add a department of type
          &ldquo;Theatre&rdquo; in Settings → Organization first.
        </p>
      ) : null}

      {departments.length > 0 ? (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!clinic) return;
            createRoom.mutate(
              {
                clinic: clinic.uuid,
                department: departmentUuid,
                name,
                code: code || undefined,
                kind,
              },
              {
                onSuccess: () => {
                  setName("");
                  setCode("");
                },
              },
            );
          }}
        >
          {departments.length > 1 ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="theatre-room-department">Theatre department</Label>
              <select
                id="theatre-room-department"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={departmentUuid}
                onChange={(event) => setDepartmentUuid(event.target.value)}
              >
                {departments.map((department) => (
                  <option key={department.uuid} value={department.uuid}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="theatre-room-name">Room name</Label>
            <Input
              id="theatre-room-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="OT 1"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="theatre-room-code">Code (optional)</Label>
            <Input
              id="theatre-room-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="OT1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="theatre-room-kind">Kind</Label>
            <select
              id="theatre-room-kind"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={kind}
              onChange={(event) => setKind(event.target.value as TheatreRoomKind)}
            >
              {ROOM_KINDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={createRoom.isPending || !name.trim()}>
              Add room
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : "Could not save the room."}
        </p>
      ) : null}

      <ul className="divide-y divide-brand-border">
        {(roomsQuery.data ?? []).map((room) => (
          <li
            key={room.uuid}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div className="text-sm">
              <p className="font-medium text-brand-navy">
                {room.name} ({room.code})
              </p>
              <p className="text-brand-muted">
                {room.department_name} · {room.kind}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusDotBadge tone={room.is_active ? "success" : "neutral"}>
                {room.is_active ? "Active" : "Inactive"}
              </StatusDotBadge>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={updateRoom.isPending}
                onClick={() =>
                  updateRoom.mutate({
                    uuid: room.uuid,
                    payload: { is_active: !room.is_active },
                  })
                }
              >
                {room.is_active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
