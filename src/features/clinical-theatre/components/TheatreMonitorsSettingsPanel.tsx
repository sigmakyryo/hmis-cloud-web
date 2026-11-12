"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyClinicalCapabilities } from "@/features/clinical-opd/hooks/use-clinical-opd";
import { useTheatreRooms } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import {
  useCreateTheatreFamilyBoardLink,
  useRevokeTheatreFamilyBoardLink,
  useRevokeTheatreMonitorDevice,
  useRotateTheatreFamilyBoardLink,
  useRotateTheatreMonitorDevice,
  useSaveTheatreMonitorDevice,
  useTheatreFamilyBoardLinks,
  useTheatreMonitorDevices,
} from "@/features/clinical-theatre/hooks/use-theatre-p4";
import {
  useTheatreSettings,
  useUpdateTheatreSettings,
} from "@/features/clinical-theatre/hooks/use-theatre-planning";
import type {
  TheatreFamilyBoardLink,
  TheatreFamilyCodeMode,
  TheatreMonitorDevice,
} from "@/features/clinical-theatre/types/theatre-p4.types";
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
  familyBoardUrl,
  formatLastSeen,
} from "@/features/clinical-theatre/utils/theatre-p4-display";
import {
  errorMessage,
  theatreClinicOptions,
} from "@/features/clinical-theatre/utils/theatre-record-display";

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const INGEST_PATHS = [
  ["JSON vitals", "POST /api/v1/theatre/devices/vitals/"],
  ["HL7 v2 ORU^R01", "POST /api/v1/theatre/devices/hl7/"],
  ["Credential check", "GET /api/v1/theatre/devices/ping/"],
] as const;

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

/** Shown once after create / rotate: the secret is never retrievable again. */
function DeviceSecretNotice({ device, onDone }: { device: TheatreMonitorDevice; onDone: () => void }) {
  return (
    <div
      className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm"
      data-testid="theatre-device-secret"
    >
      <p className="font-medium text-amber-900">
        Copy the credentials for “{device.name}” now. The secret is shown only once.
      </p>
      <div className="grid gap-2 md:grid-cols-[120px_1fr_auto] md:items-center">
        <span className="text-xs text-muted-foreground">Key id (X-Device-Key)</span>
        <code className="break-all rounded bg-white px-2 py-1">{device.key_id}</code>
        <CopyButton value={device.key_id} />
        <span className="text-xs text-muted-foreground">Secret (Bearer)</span>
        <code className="break-all rounded bg-white px-2 py-1">{device.secret}</code>
        <CopyButton value={device.secret ?? ""} />
      </div>
      <ul className="text-xs text-muted-foreground">
        {INGEST_PATHS.map(([label, path]) => (
          <li key={path}>
            {label}: <code>{path}</code> on the API host
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Payload formats, HMAC signing and rate limits are documented in
        docs/theatre-monitor-integration.md in the API repository.
      </p>
      <Button size="sm" onClick={onDone}>
        I have stored the secret
      </Button>
    </div>
  );
}

function MonitorDevicesSection() {
  const [showRevoked, setShowRevoked] = useState(false);
  const { data: devices = [], isLoading, error } = useTheatreMonitorDevices(showRevoked);
  const { data: rooms = [] } = useTheatreRooms();
  const save = useSaveTheatreMonitorDevice();
  const rotate = useRotateTheatreMonitorDevice();
  const revoke = useRevokeTheatreMonitorDevice();
  const [draft, setDraft] = useState({ name: "", room_uuid: "", notes: "", require_signature: false });
  const [revealed, setRevealed] = useState<TheatreMonitorDevice | null>(null);
  const mutationError = save.error ?? rotate.error ?? revoke.error;

  const create = () =>
    save.mutate(
      { payload: { ...draft, name: draft.name.trim() } },
      {
        onSuccess: (device) => {
          setRevealed(device);
          setDraft({ name: "", room_uuid: "", notes: "", require_signature: false });
        },
      },
    );

  return (
    <section className="space-y-3" data-testid="theatre-monitor-devices">
      <div>
        <h3 className="text-base font-semibold text-brand-navy">Anaesthesia monitors</h3>
        <p className="text-sm text-muted-foreground">
          Register each monitor or gateway that sends vitals. A device is bound to a theatre room
          and posts to the case in theatre in that room. Readings arrive as “awaiting review” for a
          clinician to validate. Compatibility with a particular monitor is not certified; test
          with your own equipment.
        </p>
      </div>

      {revealed?.secret ? (
        <DeviceSecretNotice device={revealed} onDone={() => setRevealed(null)} />
      ) : null}

      <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
        <div className="space-y-1">
          <Label htmlFor="device-name">Name</Label>
          <Input
            id="device-name"
            className="w-48"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="device-room">Theatre room</Label>
          <select
            id="device-room"
            className={SELECT_CLASS}
            value={draft.room_uuid}
            onChange={(event) => setDraft({ ...draft, room_uuid: event.target.value })}
          >
            <option value="">Select room</option>
            {rooms.map((room) => (
              <option key={room.uuid} value={room.uuid}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="device-notes">Notes</Label>
          <Input
            id="device-notes"
            className="w-56"
            placeholder="Model, serial, gateway"
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={draft.require_signature}
            onChange={(event) => setDraft({ ...draft, require_signature: event.target.checked })}
          />
          Require HMAC signature
        </label>
        <Button disabled={save.isPending || !draft.name.trim() || !draft.room_uuid} onClick={create}>
          Register device
        </Button>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={showRevoked} onChange={(event) => setShowRevoked(event.target.checked)} />
        Show revoked devices
      </label>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading devices…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{errorMessage(error, "Could not load devices.")}</p>
      ) : devices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No monitors registered yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-3">Device</th>
              <th className="py-1 pr-3">Room</th>
              <th className="py-1 pr-3">Status</th>
              <th className="py-1 pr-3">Key id</th>
              <th className="py-1 pr-3">Signature</th>
              <th className="py-1 pr-3" />
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => {
              const revoked = Boolean(device.revoked_at);
              return (
                <tr key={device.uuid} className="border-t align-top" data-testid={`theatre-device-${device.uuid}`}>
                  <td className="py-2 pr-3">
                    <p className="font-medium">{device.name}</p>
                    {device.notes ? <p className="text-xs text-muted-foreground">{device.notes}</p> : null}
                    <p className="text-xs text-muted-foreground">
                      {device.observations_received} readings received
                    </p>
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      aria-label={`Room for ${device.name}`}
                      className={SELECT_CLASS}
                      disabled={revoked || save.isPending}
                      value={device.room_uuid ?? ""}
                      onChange={(event) =>
                        save.mutate({ uuid: device.uuid, payload: { room_uuid: event.target.value } })
                      }
                    >
                      {rooms.map((room) => (
                        <option key={room.uuid} value={room.uuid}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge variant={DEVICE_STATUS_VARIANT[device.status]}>
                      {DEVICE_STATUS_LABELS[device.status]}
                    </Badge>
                    <p className="text-xs text-muted-foreground">Last seen {formatLastSeen(device.last_seen_at)}</p>
                    {device.last_error ? <p className="text-xs text-red-600">{device.last_error}</p> : null}
                  </td>
                  <td className="py-2 pr-3">
                    <code className="text-xs">{device.key_id}</code>
                    <p className="text-xs text-muted-foreground">secret …{device.secret_hint}</p>
                  </td>
                  <td className="py-2 pr-3">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        aria-label={`Require signature for ${device.name}`}
                        disabled={revoked || save.isPending}
                        checked={device.require_signature}
                        onChange={(event) =>
                          save.mutate({
                            uuid: device.uuid,
                            payload: { require_signature: event.target.checked },
                          })
                        }
                      />
                      Required
                    </label>
                  </td>
                  <td className="py-2 pr-3">
                    {revoked ? (
                      <span className="text-xs text-muted-foreground">Revoked</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={rotate.isPending}
                          onClick={() => {
                            if (window.confirm(`Issue a new secret for ${device.name}? The current secret stops working immediately.`)) {
                              rotate.mutate(device.uuid, { onSuccess: setRevealed });
                            }
                          }}
                        >
                          Rotate secret
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={revoke.isPending}
                          onClick={() => {
                            if (window.confirm(`Revoke ${device.name}? It will no longer be able to send vitals.`)) {
                              revoke.mutate(device.uuid);
                            }
                          }}
                        >
                          Revoke
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {mutationError ? (
        <p className="text-sm text-red-600">{errorMessage(mutationError, "Could not save the device.")}</p>
      ) : null}
    </section>
  );
}

function FamilyBoardSettingsSection() {
  const { data: settings } = useTheatreSettings();
  const update = useUpdateTheatreSettings();
  const [draft, setDraft] = useState<{
    family_board_code_mode?: TheatreFamilyCodeMode;
    family_board_digits?: number;
    family_board_title?: string;
  }>({});
  const mode = draft.family_board_code_mode ?? settings?.family_board_code_mode ?? "tracking_code";
  const digits = draft.family_board_digits ?? settings?.family_board_digits ?? 3;
  const title = draft.family_board_title ?? settings?.family_board_title ?? "";

  return (
    <div className="space-y-3 rounded-md border p-3" data-testid="theatre-family-board-settings">
      <h4 className="text-sm font-semibold text-brand-navy">Patient code on the board</h4>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="family-code-mode">Code shown</Label>
          <select
            id="family-code-mode"
            className={SELECT_CLASS}
            value={mode}
            onChange={(event) =>
              setDraft({ ...draft, family_board_code_mode: event.target.value as TheatreFamilyCodeMode })
            }
          >
            <option value="tracking_code">Tracking code (printed card for the family)</option>
            <option value="initials_digits">Initials + last digits of patient number</option>
          </select>
        </div>
        {mode === "initials_digits" ? (
          <div className="space-y-1">
            <Label htmlFor="family-code-digits">Digits</Label>
            <Input
              id="family-code-digits"
              type="number"
              min={2}
              max={5}
              className="w-20"
              value={digits}
              onChange={(event) => setDraft({ ...draft, family_board_digits: Number(event.target.value) })}
            />
          </div>
        ) : null}
        <div className="space-y-1">
          <Label htmlFor="family-board-title">Board title</Label>
          <Input
            id="family-board-title"
            className="w-64"
            maxLength={80}
            value={title}
            onChange={(event) => setDraft({ ...draft, family_board_title: event.target.value })}
          />
        </div>
        <Button
          disabled={update.isPending || Object.keys(draft).length === 0 || !title.trim()}
          onClick={() => update.mutate(draft, { onSuccess: () => setDraft({}) })}
        >
          Save
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        The public board never shows names, numbers, procedures or rooms: only the code and the
        stage (checked in, pre-op, in theatre, in recovery, ready / returned to ward).
      </p>
      {update.error ? (
        <p className="text-sm text-red-600">{errorMessage(update.error, "Could not save settings.")}</p>
      ) : null}
    </div>
  );
}

function linkScope(link: TheatreFamilyBoardLink): string {
  if (link.room_name) return `Room: ${link.room_name}`;
  if (link.clinic_name) return `Clinic: ${link.clinic_name}`;
  return "All theatre cases";
}

function FamilyBoardLinksSection() {
  const [showRevoked, setShowRevoked] = useState(false);
  const { data: links = [], isLoading, error } = useTheatreFamilyBoardLinks(showRevoked);
  const { data: rooms = [] } = useTheatreRooms();
  const clinics = theatreClinicOptions(rooms);
  const create = useCreateTheatreFamilyBoardLink();
  const rotate = useRotateTheatreFamilyBoardLink();
  const revoke = useRevokeTheatreFamilyBoardLink();
  const [draft, setDraft] = useState({ label: "", room_uuid: "", clinic_uuid: "" });
  const [revealed, setRevealed] = useState<{ label: string; url: string } | null>(null);
  const mutationError = create.error ?? rotate.error ?? revoke.error;

  const reveal = (link: TheatreFamilyBoardLink) => {
    if (link.token) {
      setRevealed({ label: link.label, url: familyBoardUrl(link.token, window.location.origin) });
    }
  };

  return (
    <div className="space-y-3" data-testid="theatre-family-board-links">
      <h4 className="text-sm font-semibold text-brand-navy">Waiting-area screen links</h4>
      <p className="text-xs text-muted-foreground">
        Each link opens a full-screen board without a login, for a TV or tablet. Create one link
        per screen so you can revoke it on its own. The address is shown only once.
      </p>
      {revealed ? (
        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm" data-testid="theatre-family-link-url">
          <p className="font-medium text-amber-900">
            Open this address on the “{revealed.label}” screen now. It will not be shown again.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-white px-2 py-1">{revealed.url}</code>
            <CopyButton value={revealed.url} />
          </div>
          <Button size="sm" onClick={() => setRevealed(null)}>
            Done
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
        <div className="space-y-1">
          <Label htmlFor="family-link-label">Screen label</Label>
          <Input
            id="family-link-label"
            className="w-48"
            placeholder="Main waiting room TV"
            value={draft.label}
            onChange={(event) => setDraft({ ...draft, label: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="family-link-room">Room (optional)</Label>
          <select
            id="family-link-room"
            className={SELECT_CLASS}
            value={draft.room_uuid}
            onChange={(event) => setDraft({ ...draft, room_uuid: event.target.value, clinic_uuid: "" })}
          >
            <option value="">All rooms</option>
            {rooms.map((room) => (
              <option key={room.uuid} value={room.uuid}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
        {clinics.length > 1 ? (
          <div className="space-y-1">
            <Label htmlFor="family-link-clinic">Clinic (optional)</Label>
            <select
              id="family-link-clinic"
              className={SELECT_CLASS}
              value={draft.clinic_uuid}
              disabled={Boolean(draft.room_uuid)}
              onChange={(event) => setDraft({ ...draft, clinic_uuid: event.target.value })}
            >
              <option value="">All clinics</option>
              {clinics.map((clinic) => (
                <option key={clinic.uuid} value={clinic.uuid}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Button
          disabled={create.isPending || !draft.label.trim()}
          onClick={() =>
            create.mutate(
              {
                label: draft.label.trim(),
                room_uuid: draft.room_uuid || null,
                clinic_uuid: draft.clinic_uuid || null,
              },
              {
                onSuccess: (link) => {
                  reveal(link);
                  setDraft({ label: "", room_uuid: "", clinic_uuid: "" });
                },
              },
            )
          }
        >
          Create link
        </Button>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={showRevoked} onChange={(event) => setShowRevoked(event.target.checked)} />
        Show revoked links
      </label>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading links…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{errorMessage(error, "Could not load links.")}</p>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No screen links yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-3">Screen</th>
              <th className="py-1 pr-3">Shows</th>
              <th className="py-1 pr-3">Link ends</th>
              <th className="py-1 pr-3">Last used</th>
              <th className="py-1 pr-3" />
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.uuid} className="border-t">
                <td className="py-2 pr-3 font-medium">{link.label}</td>
                <td className="py-2 pr-3">{linkScope(link)}</td>
                <td className="py-2 pr-3"><code className="text-xs">…{link.token_hint}</code></td>
                <td className="py-2 pr-3">{formatLastSeen(link.last_used_at)}</td>
                <td className="py-2 pr-3">
                  {link.revoked_at ? (
                    <span className="text-xs text-muted-foreground">Revoked</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={rotate.isPending}
                        onClick={() => {
                          if (window.confirm(`Replace the link for ${link.label}? The current address stops working.`)) {
                            rotate.mutate(link.uuid, { onSuccess: reveal });
                          }
                        }}
                      >
                        New address
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={revoke.isPending}
                        onClick={() => {
                          if (window.confirm(`Revoke the link for ${link.label}?`)) revoke.mutate(link.uuid);
                        }}
                      >
                        Revoke
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {mutationError ? (
        <p className="text-sm text-red-600">{errorMessage(mutationError, "Could not save the link.")}</p>
      ) : null}
    </div>
  );
}

/** Settings → Theatre → Monitors & family board. */
export function TheatreMonitorsSettingsPanel() {
  const { data: capabilityData, isLoading } = useMyClinicalCapabilities();
  const capabilities = capabilityData?.capabilities ?? [];
  const canDevices = capabilities.includes("manage_theatre_devices");
  const canBoard = capabilities.includes("manage_theatre_family_board");

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8" data-testid="theatre-monitors-settings">
      {canDevices ? (
        <MonitorDevicesSection />
      ) : (
        <p className="text-sm text-muted-foreground">
          You need the “Manage theatre monitors” capability to register monitors.
        </p>
      )}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-brand-navy">Family status board</h3>
          <p className="text-sm text-muted-foreground">
            A privacy-safe board for families: a patient code and the stage of care only.
          </p>
        </div>
        {canBoard ? (
          <>
            <FamilyBoardSettingsSection />
            <FamilyBoardLinksSection />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            You need the “Manage family status board” capability to change board settings and
            screen links.
          </p>
        )}
      </section>
    </div>
  );
}
