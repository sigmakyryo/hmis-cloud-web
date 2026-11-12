"use client";

import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { fetchCatalogProducts } from "@/features/catalog/services/catalog.service";
import {
  useArchiveTheatreTraySet,
  useCreateTheatreTray,
  useRetireTheatreTray,
  useSaveTheatreSteriliser,
  useSaveTheatreTraySet,
  useTheatreSterilisers,
  useTheatreTraySets,
  useTheatreTrays,
} from "@/features/clinical-theatre/hooks/use-theatre-cssd";
import {
  useTheatreSettings,
  useUpdateTheatreSettings,
} from "@/features/clinical-theatre/hooks/use-theatre-planning";
import type {
  TheatreSterilisationMethod,
  TheatreSteriliser,
  TheatreTraySet,
  TheatreTraySetItemPayload,
} from "@/features/clinical-theatre/types/theatre-cssd.types";
import {
  STERILISATION_METHODS,
  TRAY_STATUS_LABELS,
  TRAY_STATUS_TONE,
} from "@/features/clinical-theatre/utils/theatre-cssd-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

type ItemDraft = TheatreTraySetItemPayload & { key: string; product_name?: string };

let draftKey = 0;
const nextKey = () => `item-${(draftKey += 1)}`;

/** Validation message for a tray set draft ("" when it can be saved). */
export function traySetDraftProblem(draft: {
  name: string;
  code: string;
  shelf_life_days: string;
  items: ItemDraft[];
}): string {
  if (!draft.name.trim()) return "Give the tray set a name.";
  if (!draft.code.trim()) return "Give the tray set a code.";
  if (!(Number(draft.shelf_life_days) >= 1)) return "Shelf life must be at least 1 day.";
  if (draft.items.some((item) => !(item.name ?? "").trim() && !item.product_uuid)) {
    return "Each instrument needs a name or catalogue product.";
  }
  if (draft.items.some((item) => !(Number(item.quantity) >= 1))) {
    return "Each instrument needs a quantity of at least 1.";
  }
  return "";
}

function MethodSelect({
  value,
  onChange,
  label,
}: {
  value: TheatreSterilisationMethod;
  onChange: (value: TheatreSterilisationMethod) => void;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as TheatreSterilisationMethod)}>
      <SelectTrigger aria-label={label} className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STERILISATION_METHODS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CountRuleSection() {
  const { data } = useTheatreSettings();
  const update = useUpdateTheatreSettings();
  if (!data) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-brand-navy">Surgical count</h2>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          aria-label="Require a surgical count for every case"
          checked={Boolean(data.require_surgical_count)}
          disabled={update.isPending}
          onChange={(event) => update.mutate({ require_surgical_count: event.target.checked })}
        />
        Require a reconciled surgical count before WHO sign-out for every case
      </label>
      <p className="text-xs text-muted-foreground">
        When off, the count only gates sign-out on cases where a count sheet was started.
        Crash cases can always proceed with a documented bypass.
      </p>
      {update.error ? (
        <p className="text-sm text-red-600">{errorMessage(update.error, "Could not save.")}</p>
      ) : null}
    </section>
  );
}

function SteriliserRow({ steriliser }: { steriliser: TheatreSteriliser }) {
  const save = useSaveTheatreSteriliser();
  const [name, setName] = useState(steriliser.name);
  const [location, setLocation] = useState(steriliser.location);
  const [method, setMethod] = useState(steriliser.method);
  const dirty =
    name.trim() !== steriliser.name ||
    location.trim() !== steriliser.location ||
    method !== steriliser.method;
  return (
    <tr className="border-t" data-testid="theatre-steriliser-row">
      <td className="py-1.5 pr-2 font-medium">{steriliser.code}</td>
      <td className="py-1.5 pr-2">
        <Input aria-label={`Name for ${steriliser.code}`} value={name} onChange={(event) => setName(event.target.value)} />
      </td>
      <td className="py-1.5 pr-2">
        <MethodSelect value={method} onChange={setMethod} label={`Method for ${steriliser.code}`} />
      </td>
      <td className="py-1.5 pr-2">
        <Input
          aria-label={`Location for ${steriliser.code}`}
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
      </td>
      <td className="py-1.5 text-right whitespace-nowrap">
        {steriliser.is_active ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={!dirty || !name.trim() || save.isPending}
              onClick={() =>
                save.mutate({
                  uuid: steriliser.uuid,
                  payload: { name: name.trim(), location: location.trim(), method },
                })
              }
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={save.isPending}
              onClick={() => save.mutate({ uuid: steriliser.uuid, payload: { is_active: false } })}
            >
              Archive
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={save.isPending}
            onClick={() => save.mutate({ uuid: steriliser.uuid, payload: { is_active: true } })}
          >
            Restore
          </Button>
        )}
        {save.error ? (
          <p className="text-xs text-red-600">{errorMessage(save.error, "Could not save.")}</p>
        ) : null}
      </td>
    </tr>
  );
}

function SterilisersSection() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: sterilisers = [], isLoading } = useTheatreSterilisers(showArchived);
  const save = useSaveTheatreSteriliser();
  const [draft, setDraft] = useState({ name: "", code: "", location: "", method: "steam" as TheatreSterilisationMethod });
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-brand-navy">Sterilisers</h2>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
          Show archived
        </label>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sterilisers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sterilisers yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-2">Code</th>
              <th className="py-1 pr-2">Name</th>
              <th className="py-1 pr-2">Method</th>
              <th className="py-1 pr-2">Location</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {sterilisers.map((row) => (
              <SteriliserRow key={`${row.uuid}-${row.is_active}`} steriliser={row} />
            ))}
          </tbody>
        </table>
      )}
      <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
        <div className="space-y-1">
          <Label htmlFor="steriliser-code">Code</Label>
          <Input id="steriliser-code" className="w-28" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="steriliser-name">Name</Label>
          <Input id="steriliser-name" className="w-48" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Method</Label>
          <MethodSelect value={draft.method} onChange={(method) => setDraft({ ...draft, method })} label="New steriliser method" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="steriliser-location">Location</Label>
          <Input id="steriliser-location" className="w-40" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
        </div>
        <Button
          disabled={!draft.name.trim() || !draft.code.trim() || save.isPending}
          onClick={() =>
            save.mutate(
              { payload: { ...draft, name: draft.name.trim(), code: draft.code.trim() } },
              { onSuccess: () => setDraft({ name: "", code: "", location: "", method: "steam" }) },
            )
          }
        >
          Add steriliser
        </Button>
      </div>
      {save.error ? <p className="text-sm text-red-600">{errorMessage(save.error, "Could not save.")}</p> : null}
    </section>
  );
}

function ProductSearch({ onPick }: { onPick: (product: { uuid: string; name: string }) => void }) {
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search.trim());
  const products = useQuery({
    queryKey: ["theatre", "tray-set-products", q],
    queryFn: () => fetchCatalogProducts({ search: q, active: true, pageSize: 8 }),
    enabled: q.length >= 2,
  });
  const rows = (products.data?.results ?? []).filter((row) => row.product_type !== "service");
  return (
    <div className="space-y-1">
      <Input
        aria-label="Search catalogue instrument"
        placeholder="Add from catalogue (optional)"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {q.length >= 2 ? (
        <ul className="max-h-40 space-y-0.5 overflow-y-auto text-sm">
          {rows.length === 0 ? (
            <li className="text-muted-foreground">{products.isLoading ? "Searching…" : "No matching products."}</li>
          ) : (
            rows.map((row) => (
              <li key={row.uuid}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1 text-left hover:bg-muted"
                  onClick={() => {
                    onPick({ uuid: row.uuid, name: row.display_name || row.name });
                    setSearch("");
                  }}
                >
                  {row.display_name || row.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function TraySetDialog({ traySet, onClose }: { traySet: TheatreTraySet | null; onClose: () => void }) {
  const save = useSaveTheatreTraySet();
  const [draft, setDraft] = useState({
    name: traySet?.name ?? "",
    code: traySet?.code ?? "",
    specialty: traySet?.specialty ?? "",
    method: traySet?.method ?? ("steam" as TheatreSterilisationMethod),
    shelf_life_days: String(traySet?.shelf_life_days ?? 30),
    notes: traySet?.notes ?? "",
    items: (traySet?.items ?? []).map<ItemDraft>((item) => ({
      key: nextKey(),
      product_uuid: item.product_uuid,
      product_name: item.product_name,
      name: item.name,
      quantity: item.quantity,
      notes: item.notes,
    })),
  });
  const problem = traySetDraftProblem(draft);
  const setItem = (key: string, patch: Partial<ItemDraft>) =>
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{traySet ? `Edit ${traySet.name}` : "New tray set"}</DialogTitle>
          <DialogDescription>
            A tray set defines the instruments in a tray. Each physical tray is registered with
            its own barcode.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="tray-set-name">Name</Label>
            <Input id="tray-set-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tray-set-code">Code</Label>
            <Input id="tray-set-code" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tray-set-specialty">Specialty</Label>
            <Input id="tray-set-specialty" value={draft.specialty} onChange={(event) => setDraft({ ...draft, specialty: event.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tray-set-shelf">Sterile shelf life (days)</Label>
            <Input
              id="tray-set-shelf"
              type="number"
              min={1}
              value={draft.shelf_life_days}
              onChange={(event) => setDraft({ ...draft, shelf_life_days: event.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Sterilisation method</Label>
            <MethodSelect value={draft.method} onChange={(method) => setDraft({ ...draft, method })} label="Tray set method" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Instruments</p>
          {draft.items.length === 0 ? (
            <p className="text-xs text-muted-foreground">No instruments listed yet.</p>
          ) : null}
          {draft.items.map((item) => (
            <div key={item.key} className="flex flex-wrap items-center gap-2" data-testid="tray-set-item-row">
              <Input
                aria-label="Instrument name"
                className="min-w-[200px] flex-1"
                placeholder={item.product_name || "Instrument name"}
                value={item.name ?? ""}
                onChange={(event) => setItem(item.key, { name: event.target.value })}
              />
              {item.product_uuid ? (
                <span className="text-xs text-muted-foreground">Catalogue: {item.product_name}</span>
              ) : null}
              <Input
                aria-label="Instrument quantity"
                type="number"
                min={1}
                className="w-20"
                value={String(item.quantity)}
                onChange={(event) => setItem(item.key, { quantity: Number(event.target.value) })}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setDraft((current) => ({ ...current, items: current.items.filter((row) => row.key !== item.key) }))
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-start gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  items: [...current.items, { key: nextKey(), name: "", quantity: 1 }],
                }))
              }
            >
              Add instrument
            </Button>
            <div className="min-w-[240px] flex-1">
              <ProductSearch
                onPick={(product) =>
                  setDraft((current) => ({
                    ...current,
                    items: [
                      ...current.items,
                      { key: nextKey(), product_uuid: product.uuid, product_name: product.name, name: product.name, quantity: 1 },
                    ],
                  }))
                }
              />
            </div>
          </div>
        </div>
        {problem ? <p className="text-xs text-muted-foreground">{problem}</p> : null}
        {save.error ? <p className="text-sm text-red-600">{errorMessage(save.error, "Could not save.")}</p> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={Boolean(problem) || save.isPending}
            onClick={() =>
              save.mutate(
                {
                  uuid: traySet?.uuid,
                  payload: {
                    name: draft.name.trim(),
                    code: draft.code.trim(),
                    specialty: draft.specialty.trim(),
                    method: draft.method,
                    shelf_life_days: Number(draft.shelf_life_days),
                    notes: draft.notes,
                    items: draft.items.map((item) => ({
                      product_uuid: item.product_uuid ?? null,
                      name: (item.name ?? "").trim(),
                      quantity: Number(item.quantity),
                      notes: item.notes ?? "",
                    })),
                  },
                },
                { onSuccess: onClose },
              )
            }
          >
            Save tray set
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TraysForSet({ traySet }: { traySet: TheatreTraySet }) {
  const { data: trays = [] } = useTheatreTrays({ tray_set: traySet.uuid });
  const create = useCreateTheatreTray();
  const retire = useRetireTheatreTray();
  const [barcode, setBarcode] = useState("");
  const [label, setLabel] = useState("");
  return (
    <div className="space-y-2 rounded-md bg-slate-50 p-3" data-testid="tray-set-trays">
      {trays.length === 0 ? (
        <p className="text-xs text-muted-foreground">No physical trays registered.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {trays.map((tray) => (
            <li key={tray.uuid} className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{tray.barcode}</span>
              {tray.label ? <span className="text-muted-foreground">{tray.label}</span> : null}
              <StatusDotBadge tone={TRAY_STATUS_TONE[tray.status]}>{TRAY_STATUS_LABELS[tray.status]}</StatusDotBadge>
              {tray.status !== "in_use" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7"
                  disabled={retire.isPending}
                  onClick={() => {
                    if (window.confirm(`Retire tray ${tray.barcode}? It can no longer be used.`)) {
                      retire.mutate(tray.uuid);
                    }
                  }}
                >
                  Retire
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <Input aria-label="New tray barcode" placeholder="Barcode / tray ID" className="w-44" value={barcode} onChange={(event) => setBarcode(event.target.value)} />
        <Input aria-label="New tray label" placeholder="Label (optional)" className="w-44" value={label} onChange={(event) => setLabel(event.target.value)} />
        <Button
          size="sm"
          disabled={!barcode.trim() || create.isPending}
          onClick={() =>
            create.mutate(
              { tray_set_uuid: traySet.uuid, barcode: barcode.trim(), label: label.trim() },
              {
                onSuccess: () => {
                  setBarcode("");
                  setLabel("");
                },
              },
            )
          }
        >
          Register tray
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">New trays must go through a sterilisation cycle before use.</p>
      {create.error ?? retire.error ? (
        <p className="text-sm text-red-600">{errorMessage(create.error ?? retire.error, "Could not save.")}</p>
      ) : null}
    </div>
  );
}

function TraySetsSection() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: sets = [], isLoading } = useTheatreTraySets(showArchived);
  const archive = useArchiveTheatreTraySet();
  const [editing, setEditing] = useState<TheatreTraySet | "new" | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-brand-navy">Instrument tray sets</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
            Show archived
          </label>
          <Button size="sm" onClick={() => setEditing("new")}>
            New tray set
          </Button>
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tray sets yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {sets.map((set) => (
            <li key={set.uuid} className="space-y-2 p-3" data-testid="tray-set-row">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {set.name} <span className="text-xs text-muted-foreground">· {set.code}</span>
                    {!set.is_active ? <span className="ml-1 text-xs text-muted-foreground">(archived)</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {set.items.length} instrument line(s) · {set.method_label} · sterile for {set.shelf_life_days} day(s)
                    {set.tray_count !== null ? ` · ${set.tray_count} tray(s)` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setOpen(open === set.uuid ? null : set.uuid)}>
                    {open === set.uuid ? "Hide trays" : "Trays"}
                  </Button>
                  {set.is_active ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditing(set)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={archive.isPending}
                        onClick={() => archive.mutate(set.uuid)}
                      >
                        Archive
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              {open === set.uuid ? <TraysForSet traySet={set} /> : null}
            </li>
          ))}
        </ul>
      )}
      {archive.error ? <p className="text-sm text-red-600">{errorMessage(archive.error, "Could not archive.")}</p> : null}
      {editing ? (
        <TraySetDialog traySet={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      ) : null}
    </section>
  );
}

/** Settings → Theatre → CSSD: count rule, sterilisers, tray sets and trays. */
export function TheatreCssdSettingsPanel() {
  return (
    <div className="space-y-8" data-testid="theatre-cssd-settings">
      <CountRuleSection />
      <SterilisersSection />
      <TraySetsSection />
    </div>
  );
}
