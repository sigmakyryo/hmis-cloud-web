import { isSuppressed, toNumber } from "@/features/occupational-health/components/annual/annual-utils";

/**
 * Turns one report section's flat rows into what the page draws: headline figures, and breakdowns
 * whose parts add up to a whole ("Examinations: periodic", "HEPB · up_to_date").
 */

export type AreaStat = { key: string; label: string; value: number | string };
export type AreaPart = { key: string; label: string; value: number | string; share: number | null };
export type AreaBreakdown = { key: string; title: string; parts: AreaPart[]; hasHidden: boolean };
export type AreaLayout = { stats: AreaStat[]; breakdowns: AreaBreakdown[] };

/** Readable names for the breakdown prefixes the service sends. */
const BREAKDOWN_TITLE: Record<string, string> = {
  Examinations: "By examination type",
  Outcome: "By fitness outcome",
  Severity: "By severity",
  Reason: "By reason for test",
  "Final result": "By final result",
  Biological: "By biological exposure type",
};

/** "pre_employment" → "Pre employment". */
export function humanise(text: string): string {
  const clean = text.replace(/_/g, " ").trim();
  return clean ? clean[0].toUpperCase() + clean.slice(1) : text;
}

/**
 * Each part's whole-number share of its breakdown. If any part is hidden as "<5" the true total is
 * unknown, so no shares are given: a share worked out without the hidden part would be wrong.
 */
function withShares(parts: Array<Omit<AreaPart, "share">>): { parts: AreaPart[]; hasHidden: boolean } {
  const hasHidden = parts.some((part) => isSuppressed(part.value));
  const numbers = parts.map((part) => toNumber(part.value));
  const total = numbers.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const canShare = !hasHidden && parts.length >= 2 && total > 0 && numbers.every((value) => value !== null);
  return {
    hasHidden,
    parts: parts.map((part, index) => ({ ...part, share: canShare ? Math.round(((numbers[index] ?? 0) / total) * 100) : null })),
  };
}

export function areaLayout(rows: Record<string, number | string>): AreaLayout {
  const stats: AreaStat[] = [];
  const groups = new Map<string, Array<Omit<AreaPart, "share">>>();

  for (const [key, value] of Object.entries(rows)) {
    const prefixed = /^([^:]+): (.+)$/.exec(key);
    const dotted = /^(.+?) · (.+)$/.exec(key);
    const match = prefixed ?? dotted;
    if (match) {
      const group = match[1].trim();
      groups.set(group, [...(groups.get(group) ?? []), { key, label: humanise(match[2]), value }]);
    } else if (key.endsWith(" %")) {
      stats.push({ key, label: key.slice(0, -2), value: toNumber(value) === null ? value : `${value}%` });
    } else {
      stats.push({ key, label: key, value });
    }
  }

  // Why: largest part first, so the darkest segment of the bar is the biggest; hidden counts go last.
  const size = (value: number | string) => toNumber(value) ?? -1;
  const breakdowns = [...groups.entries()].map(([group, parts]) => ({
    key: group,
    title: BREAKDOWN_TITLE[group] ?? humanise(group),
    ...withShares([...parts].sort((a, b) => size(b.value) - size(a.value))),
  }));
  return { stats, breakdowns };
}

/**
 * How many of `total` ticks each value gets, in proportion, by largest remainder. Every part above zero
 * keeps at least one tick so a small part is still visible; zero parts get none.
 */
export function tickCounts(values: number[], total = 48): number[] {
  const sum = values.reduce((acc, value) => acc + Math.max(0, value), 0);
  if (sum <= 0) return values.map(() => 0);
  const exact = values.map((value) => (Math.max(0, value) / sum) * total);
  const counts = exact.map((value, index) => (values[index] > 0 ? Math.max(1, Math.floor(value)) : 0));
  let left = total - counts.reduce((acc, value) => acc + value, 0);
  const order = exact.map((value, index) => ({ index, remainder: value - Math.floor(value) })).sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; left > 0 && order.length > 0; i = (i + 1) % order.length) {
    if (values[order[i].index] > 0) {
      counts[order[i].index] += 1;
      left -= 1;
    }
  }
  // Why: minimum-of-one can overshoot the total; take the excess back from the largest part.
  while (left < 0) {
    const biggest = counts.indexOf(Math.max(...counts));
    counts[biggest] -= 1;
    left += 1;
  }
  return counts;
}
