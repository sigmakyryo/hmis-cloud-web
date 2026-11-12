"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateTheatreUrgencyCategory,
  useTheatreUrgencyCategories,
  useUpdateTheatreUrgencyCategory,
} from "@/features/clinical-theatre/hooks/use-theatre-planning";
import type { TheatreUrgencyCategory } from "@/features/clinical-theatre/types/theatre-planning.types";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

function CategoryRow({ category }: { category: TheatreUrgencyCategory }) {
  const update = useUpdateTheatreUrgencyCategory();
  const [label, setLabel] = useState(category.label);
  const [days, setDays] = useState(String(category.target_days));
  const [description, setDescription] = useState(category.description);
  const dirty =
    label.trim() !== category.label ||
    Number(days) !== category.target_days ||
    description.trim() !== category.description;
  return (
    <tr className="border-t" data-testid="theatre-urgency-category-row">
      <td className="py-1.5 pr-2 font-medium">{category.code}</td>
      <td className="py-1.5 pr-2">
        <Input aria-label={`Label for ${category.code}`} value={label} onChange={(event) => setLabel(event.target.value)} />
      </td>
      <td className="py-1.5 pr-2">
        <Input
          aria-label={`Target days for ${category.code}`}
          type="number"
          min={1}
          className="w-24"
          value={days}
          onChange={(event) => setDays(event.target.value)}
        />
      </td>
      <td className="py-1.5 pr-2">
        <Input
          aria-label={`Description for ${category.code}`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </td>
      <td className="py-1.5 text-right whitespace-nowrap">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!dirty || update.isPending || Number(days) < 1}
          onClick={() =>
            update.mutate({
              uuid: category.uuid,
              payload: { label: label.trim(), target_days: Number(days), description: description.trim() },
            })
          }
        >
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={update.isPending}
          onClick={() =>
            update.mutate({ uuid: category.uuid, payload: { is_active: !category.is_active } })
          }
        >
          {category.is_active ? "Retire" : "Restore"}
        </Button>
        {update.error ? (
          <p className="text-xs text-red-600">{errorMessage(update.error, "Could not save.")}</p>
        ) : null}
      </td>
    </tr>
  );
}

/** Waiting list urgency categories (P1–P4 by default) and their target days. */
export function TheatreUrgencyCategoriesSettingsPanel() {
  const { data: categories = [], isLoading } = useTheatreUrgencyCategories(true);
  const create = useCreateTheatreUrgencyCategory();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState("");
  return (
    <section className="space-y-3" data-testid="theatre-urgency-categories-settings">
      <div>
        <h2 className="text-base font-semibold text-brand-navy">Waiting list urgency categories</h2>
        <p className="text-sm text-muted-foreground">
          Each category sets the target number of days from the decision to operate. Patients
          past the target are flagged as breached.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-2">Code</th>
              <th className="py-1 pr-2">Label</th>
              <th className="py-1 pr-2">Target days</th>
              <th className="py-1 pr-2">Description</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <CategoryRow key={`${category.uuid}-${category.is_active}`} category={category} />
            ))}
          </tbody>
        </table>
      )}
      <div className="grid gap-3 rounded-md border p-3 md:grid-cols-4 md:items-end">
        <div className="space-y-1">
          <Label htmlFor="theatre-category-code">Code</Label>
          <Input id="theatre-category-code" value={code} maxLength={16} onChange={(event) => setCode(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="theatre-category-label">Label</Label>
          <Input id="theatre-category-label" value={label} onChange={(event) => setLabel(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="theatre-category-days">Target days</Label>
          <Input id="theatre-category-days" type="number" min={1} value={days} onChange={(event) => setDays(event.target.value)} />
        </div>
        <Button
          type="button"
          disabled={!code.trim() || !label.trim() || Number(days) < 1 || create.isPending}
          onClick={() =>
            create.mutate(
              {
                code: code.trim().toUpperCase(),
                label: label.trim(),
                target_days: Number(days),
                sort_order: categories.length + 1,
              },
              {
                onSuccess: () => {
                  setCode("");
                  setLabel("");
                  setDays("");
                },
              },
            )
          }
        >
          Add category
        </Button>
      </div>
      {create.error ? (
        <p className="text-sm text-red-600">{errorMessage(create.error, "Could not add the category.")}</p>
      ) : null}
    </section>
  );
}
