"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TheatreChartEntry } from "@/features/clinical-theatre/types/clinical-theatre.types";

type TheatreChartEntryListProps = {
  title: string;
  nameLabel: string;
  detailLabel: string;
  entries: TheatreChartEntry[];
  disabled?: boolean;
  onChange: (entries: TheatreChartEntry[]) => void;
};

/** Small editable list of chart rows (agents, fluids, blood products, events). */
export function TheatreChartEntryList({
  title,
  nameLabel,
  detailLabel,
  entries,
  disabled = false,
  onChange,
}: TheatreChartEntryListProps) {
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");

  const add = () => {
    if (!name.trim()) return;
    onChange([...entries, { name: name.trim(), dose: detail.trim() }]);
    setName("");
    setDetail("");
  };

  return (
    <div className="space-y-2" data-testid={`theatre-chart-${title.toLowerCase()}`}>
      <h4 className="text-sm font-medium text-brand-navy">{title}</h4>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">None recorded.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {entries.map((entry, index) => (
            <li
              key={`${entry.name ?? ""}-${index}`}
              className="flex items-center justify-between gap-2 rounded border px-2 py-1"
            >
              <span>
                {entry.name}
                {entry.dose ? (
                  <span className="text-muted-foreground"> · {entry.dose}</span>
                ) : null}
              </span>
              {disabled ? null : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange(entries.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {disabled ? null : (
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label={`${title} ${nameLabel}`}
            placeholder={nameLabel}
            className="max-w-[200px]"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            aria-label={`${title} ${detailLabel}`}
            placeholder={detailLabel}
            className="max-w-[160px]"
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
          />
          <Button size="sm" variant="outline" disabled={!name.trim()} onClick={add}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
