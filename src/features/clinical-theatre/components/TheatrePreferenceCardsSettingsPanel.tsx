"use client";

import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CareProviderCombobox } from "@/features/appointments/components/CareProviderCombobox";
import type { CareProvider } from "@/features/appointments/types/appointment.types";
import { fetchCatalogProducts } from "@/features/catalog/services/catalog.service";
import { TheatreProcedureProductPicker } from "@/features/clinical-theatre/components/TheatreProcedureProductPicker";
import {
  useArchiveTheatrePreferenceCard,
  useCreateTheatrePreferenceCard,
  useTheatrePreferenceCards,
  useUpdateTheatrePreferenceCard,
} from "@/features/clinical-theatre/hooks/use-theatre-catalog";
import type {
  TheatrePreferenceCard,
  TheatrePreferenceCardPayload,
  TheatreProcedureProduct,
} from "@/features/clinical-theatre/types/theatre-catalog.types";
import { parseTrayList } from "@/features/clinical-theatre/utils/theatre-catalog-display";
import type { InventoryProduct } from "@/features/inventory/types/inventory.types";
import { SettingsSection } from "@/features/settings/components/SettingsPageLayout";

type DraftItem = { product: string; name: string; quantity: string; notes: string };

type Draft = {
  surgeon: CareProvider | null;
  procedure: TheatreProcedureProduct | null;
  title: string;
  positioning: string;
  skin_prep: string;
  equipment: string;
  trays: string;
  notes: string;
  items: DraftItem[];
};

const EMPTY: Draft = {
  surgeon: null,
  procedure: null,
  title: "",
  positioning: "",
  skin_prep: "",
  equipment: "",
  trays: "",
  notes: "",
  items: [],
};

function errorText(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : "Something went wrong.";
}

function draftFromCard(card: TheatrePreferenceCard): Draft {
  return {
    surgeon: { id: card.surgeon_id, name: card.surgeon_name, user_role: "" },
    procedure: null,
    title: card.title,
    positioning: card.positioning,
    skin_prep: card.skin_prep,
    equipment: card.equipment,
    trays: card.instrument_trays.join("\n"),
    notes: card.notes,
    items: card.items.map((item) => ({
      product: item.product_uuid,
      name: item.product_name,
      quantity: item.quantity,
      notes: item.notes,
    })),
  };
}

/** Build the API payload; the product is only sent when (re)chosen. */
function preferenceCardPayload(draft: Draft): TheatrePreferenceCardPayload {
  return {
    ...(draft.surgeon ? { surgeon: draft.surgeon.id } : {}),
    ...(draft.procedure ? { product: draft.procedure.uuid } : {}),
    title: draft.title.trim(),
    positioning: draft.positioning.trim(),
    skin_prep: draft.skin_prep.trim(),
    equipment: draft.equipment.trim(),
    instrument_trays: parseTrayList(draft.trays),
    notes: draft.notes.trim(),
    items: draft.items.map((item) => ({
      product: item.product,
      quantity: item.quantity || "1",
      notes: item.notes,
    })),
  };
}

function ItemSearch({ onAdd }: { onAdd: (product: InventoryProduct) => void }) {
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search.trim());
  const products = useQuery({
    queryKey: ["theatre", "card-item-products", deferred],
    queryFn: () =>
      fetchCatalogProducts({ search: deferred, sale_ok: true, active: true, pageSize: 10 }),
    enabled: deferred.length >= 2,
  });
  const rows = (products.data?.results ?? []).filter(
    (row) => row.product_type !== "service",
  );
  return (
    <div className="relative">
      <Input
        aria-label="Add consumable or instrument"
        placeholder="Search consumables / stock items…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {deferred.length >= 2 && rows.length ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow">
          {rows.map((row) => (
            <li key={row.uuid}>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onAdd(row);
                  setSearch("");
                }}
              >
                {row.display_name || row.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CardForm({
  card,
  onDone,
}: {
  card: TheatrePreferenceCard | null;
  onDone: () => void;
}) {
  const create = useCreateTheatrePreferenceCard();
  const update = useUpdateTheatrePreferenceCard();
  const [draft, setDraft] = useState<Draft>(card ? draftFromCard(card) : EMPTY);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const pending = create.isPending || update.isPending;
  const ready = card ? true : draft.procedure !== null;

  return (
    <form
      className="space-y-3 rounded-md border p-4"
      data-testid="theatre-preference-card-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready) return;
        const payload = preferenceCardPayload(draft);
        if (card) {
          update.mutate({ uuid: card.uuid, payload }, { onSuccess: onDone });
        } else {
          create.mutate(payload, { onSuccess: onDone });
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <CareProviderCombobox
          id="pref-card-surgeon"
          label="Surgeon (blank = me)"
          value={draft.surgeon?.id ?? null}
          displayName={draft.surgeon?.name ?? null}
          onSelect={(provider) => set("surgeon", provider)}
        />
        <div className="space-y-1">
          <Label htmlFor="pref-card-procedure">
            Procedure {card ? `(currently ${card.product_name})` : ""}
          </Label>
          <TheatreProcedureProductPicker
            id="pref-card-procedure"
            value={draft.procedure}
            onChange={(product) => set("procedure", product)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pref-card-title">Title</Label>
          <Input
            id="pref-card-title"
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pref-card-positioning">Positioning</Label>
          <Input
            id="pref-card-positioning"
            value={draft.positioning}
            onChange={(event) => set("positioning", event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pref-card-prep">Skin prep</Label>
          <Input
            id="pref-card-prep"
            value={draft.skin_prep}
            onChange={(event) => set("skin_prep", event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pref-card-equipment">Equipment</Label>
          <Input
            id="pref-card-equipment"
            value={draft.equipment}
            onChange={(event) => set("equipment", event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pref-card-trays">Instrument trays (one per line)</Label>
          <Textarea
            id="pref-card-trays"
            rows={3}
            value={draft.trays}
            onChange={(event) => set("trays", event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pref-card-notes">Notes</Label>
          <Textarea
            id="pref-card-notes"
            rows={3}
            value={draft.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Consumables and stock items</p>
        {draft.items.length ? (
          <ul className="divide-y rounded-md border">
            {draft.items.map((item, index) => (
              <li key={`${item.product}-${index}`} className="flex items-center gap-2 px-3 py-1.5">
                <span className="flex-1 text-sm">{item.name}</span>
                <Input
                  aria-label={`Quantity of ${item.name}`}
                  className="h-8 w-20"
                  value={item.quantity}
                  onChange={(event) =>
                    set(
                      "items",
                      draft.items.map((row, i) =>
                        i === index ? { ...row, quantity: event.target.value } : row,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${item.name}`}
                  onClick={() =>
                    set(
                      "items",
                      draft.items.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <ItemSearch
          onAdd={(product) =>
            set("items", [
              ...draft.items,
              {
                product: product.uuid,
                name: product.display_name || product.name,
                quantity: "1",
                notes: "",
              },
            ])
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!ready || pending}>
          {card ? "Save card" : "Create card"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        {create.error || update.error ? (
          <p className="text-sm text-red-600">
            {errorText(create.error) ?? errorText(update.error)}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** Settings › Theatre › Preference cards. */
export function TheatrePreferenceCardsSettingsPanel() {
  const [mine, setMine] = useState(false);
  const cards = useTheatrePreferenceCards({ mine });
  const archive = useArchiveTheatrePreferenceCard();
  const [editing, setEditing] = useState<TheatrePreferenceCard | "new" | null>(null);
  const rows = cards.data ?? [];

  return (
    <SettingsSection
      title="Surgeon preference cards"
      description="Each surgeon's usual setup and consumables per procedure. Cards load into a case as planned items once it has a lead surgeon and a catalogue procedure; nothing is billed until an item is confirmed."
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mine}
            onChange={(event) => setMine(event.target.checked)}
          />
          Only my cards
        </label>
        {editing === null ? (
          <Button type="button" size="sm" onClick={() => setEditing("new")}>
            New card
          </Button>
        ) : null}
      </div>
      {editing !== null ? (
        <CardForm
          key={editing === "new" ? "new" : editing.uuid}
          card={editing === "new" ? null : editing}
          onDone={() => setEditing(null)}
        />
      ) : null}
      {cards.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading cards…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No preference cards yet.</p>
      ) : (
        <table className="w-full text-sm" data-testid="theatre-preference-cards-table">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-2">Surgeon</th>
              <th className="py-1.5 pr-2">Procedure</th>
              <th className="py-1.5 pr-2">Setup</th>
              <th className="py-1.5 pr-2">Items</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((card) => (
              <tr key={card.uuid} className="border-t">
                <td className="py-1.5 pr-2">{card.surgeon_name}</td>
                <td className="py-1.5 pr-2">{card.title || card.product_name}</td>
                <td className="py-1.5 pr-2 text-xs text-muted-foreground">
                  {[card.positioning, card.skin_prep, card.instrument_trays.join(", ")]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td className="py-1.5 pr-2">{card.items.length}</td>
                <td className="py-1.5 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(card)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Archive card ${card.title || card.product_name}`}
                    disabled={archive.isPending}
                    onClick={() => archive.mutate(card.uuid)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {cards.error || archive.error ? (
        <p className="text-sm text-red-600">
          {errorText(cards.error) ?? errorText(archive.error)}
        </p>
      ) : null}
    </SettingsSection>
  );
}
