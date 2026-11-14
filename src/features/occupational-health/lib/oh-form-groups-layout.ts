import type { FormLayoutItem } from "@/features/occupational-health/services/oh.service";

export type BoardItem = {
  key: string;
  name: string;
  typeLabel: string;
  statusLabel: string;
  groupUuid: string | null;
  sortOrder: number;
  ref: FormLayoutItem;
};

export type BoardGroup = { uuid: string | null; name: string; keys: string[] };

export const UNGROUPED_ID = "__ungrouped__";

/** Groups in their saved order, each with its forms in saved order; Ungrouped always last. */
export function buildBoard(
  items: BoardItem[],
  groups: Array<{ uuid: string; name: string; sort_order?: number }>,
): BoardGroup[] {
  const ordered = [...groups].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
  );
  const known = new Set(ordered.map((group) => group.uuid));
  const byOrder = [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const keysFor = (uuid: string | null) =>
    byOrder
      .filter((item) => (uuid === null ? item.groupUuid === null || !known.has(item.groupUuid) : item.groupUuid === uuid))
      .map((item) => item.key);
  return [
    ...ordered.map((group) => ({ uuid: group.uuid, name: group.name, keys: keysFor(group.uuid) })),
    { uuid: null, name: "Ungrouped", keys: keysFor(null) },
  ];
}

/** Moves a form to a group at an index (index past the end appends). */
export function moveItem(board: BoardGroup[], key: string, toGroup: string | null, toIndex: number): BoardGroup[] {
  const stripped = board.map((group) => ({ ...group, keys: group.keys.filter((k) => k !== key) }));
  return stripped.map((group) => {
    if (group.uuid !== toGroup) return group;
    const keys = [...group.keys];
    keys.splice(Math.max(0, Math.min(toIndex, keys.length)), 0, key);
    return { ...group, keys };
  });
}

/** Moves a form one place up or down within its group. */
export function nudgeItem(board: BoardGroup[], key: string, delta: -1 | 1): BoardGroup[] {
  const group = board.find((g) => g.keys.includes(key));
  if (!group) return board;
  const index = group.keys.indexOf(key);
  const target = index + delta;
  if (target < 0 || target >= group.keys.length) return board;
  return moveItem(board, key, group.uuid, target);
}

/** Moves a named group up or down; Ungrouped stays last. */
export function moveGroup(board: BoardGroup[], uuid: string, delta: -1 | 1): BoardGroup[] {
  const named = board.filter((g) => g.uuid !== null);
  const index = named.findIndex((g) => g.uuid === uuid);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= named.length) return board;
  const next = [...named];
  [next[index], next[target]] = [next[target], next[index]];
  return [...next, ...board.filter((g) => g.uuid === null)];
}

export function groupOf(board: BoardGroup[], key: string): BoardGroup | undefined {
  return board.find((group) => group.keys.includes(key));
}

export function toLayoutPayload(board: BoardGroup[], items: Map<string, BoardItem>) {
  return board.map((group) => ({
    uuid: group.uuid,
    items: group.keys.flatMap((key) => {
      const item = items.get(key);
      return item ? [item.ref] : [];
    }),
  }));
}
