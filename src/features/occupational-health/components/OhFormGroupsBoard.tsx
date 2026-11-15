"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Check, GripVertical, X } from "lucide-react";
import { AlertDialog } from "radix-ui";
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appFont } from "@/lib/fonts";
import {
  buildBoard,
  groupOf,
  moveGroup,
  moveItem,
  nudgeItem,
  toLayoutPayload,
  UNGROUPED_ID,
  type BoardGroup,
  type BoardItem,
} from "@/features/occupational-health/lib/oh-form-groups-layout";
import type { FormGroupRecord } from "@/features/occupational-health/lib/oh-form-catalog";
import {
  createFormGroup,
  deleteFormGroup,
  renameFormGroup,
  saveFormLayout,
} from "@/features/occupational-health/services/oh.service";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";

type Props = {
  items: BoardItem[];
  groups: FormGroupRecord[];
  onChanged: () => Promise<unknown>;
};

const groupDropId = (uuid: string | null) => `group:${uuid ?? UNGROUPED_ID}`;
const railDropId = (uuid: string | null) => `rail:${uuid ?? UNGROUPED_ID}`;
const itemDropId = (key: string) => `item:${key}`;

/** Insert before the form under the pointer. A group name in the rail, or the open list, appends. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const card = hits.find((hit) => String(hit.id).startsWith("item:"));
  if (card) return [card];
  const rail = hits.find((hit) => String(hit.id).startsWith("rail:"));
  if (rail) return [rail];
  return hits.length > 0 ? hits : rectIntersection(args);
};

function groupIdFromDrop(overId: string): string | null {
  if (overId.startsWith("group:")) return overId.slice("group:".length);
  if (overId.startsWith("rail:")) return overId.slice("rail:".length);
  return null;
}

export function OhFormGroupsBoard({ items, groups, onChanged }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const byKey = useMemo(() => new Map(items.map((item) => [item.key, item])), [items]);
  const saved = useMemo(() => buildBoard(items, groups), [items, groups]);
  const [draft, setDraft] = useState<BoardGroup[] | null>(null);
  const board = draft ?? saved;
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<BoardGroup | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["form-groups"] }), onChanged()]);
  };

  const save = useMutation({
    mutationFn: (next: BoardGroup[]) => saveFormLayout(toLayoutPayload(next, byKey)),
    onSuccess: async () => {
      setError(null);
      await refresh();
      setDraft(null);
    },
    onError: () => {
      setDraft(null);
      setError("Could not save the new order. Your last change was undone.");
    },
  });
  const create = useMutation({
    mutationFn: (name: string) => createFormGroup(name),
    onSuccess: async (created) => {
      setNewGroup("");
      setPicked(created.uuid);
      setError(null);
      toast({ variant: "success", title: "Group created" });
      await refresh();
    },
    onError: () => setError("Could not create the group."),
  });
  const rename = useMutation({
    mutationFn: ({ uuid, name }: { uuid: string; name: string }) => renameFormGroup(uuid, name),
    onSuccess: async () => {
      setError(null);
      await refresh();
    },
    onError: () => setError("Could not rename the group."),
  });
  const remove = useMutation({
    mutationFn: (uuid: string) => deleteFormGroup(uuid),
    onSuccess: async () => {
      setDeleting(null);
      setError(null);
      toast({ variant: "success", title: "Group deleted. Its forms are now ungrouped." });
      await refresh();
    },
    onError: () => setError("Could not delete the group."),
  });

  const busy = save.isPending || remove.isPending;
  const apply = (next: BoardGroup[]) => {
    if (next === board) return;
    setDraft(next);
    save.mutate(next);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const onDragEnd = (event: DragEndEvent) => {
    setActiveKey(null);
    const key = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return;
    if (overId.startsWith("item:")) {
      const overKey = overId.slice("item:".length);
      if (overKey === key) return;
      const target = groupOf(board, overKey);
      if (!target) return;
      // Inserts before the hovered row (moveItem removes the dragged row first).
      const without = target.keys.filter((k) => k !== key);
      setPicked(target.uuid ?? UNGROUPED_ID);
      apply(moveItem(board, key, target.uuid, without.indexOf(overKey)));
      return;
    }
    const groupId = groupIdFromDrop(overId);
    if (!groupId) return;
    const uuid = groupId === UNGROUPED_ID ? null : groupId;
    const target = board.find((group) => group.uuid === uuid);
    if (!target) return;
    setPicked(groupId);
    if (groupOf(board, key)?.uuid === uuid && target.keys.at(-1) === key) return;
    apply(moveItem(board, key, uuid, target.keys.length));
  };

  const named = board.filter((group) => group.uuid !== null);
  const active = activeKey ? byKey.get(activeKey) : undefined;
  const fallbackId = (board[0]?.uuid ?? UNGROUPED_ID);
  const selectedId = picked !== null && board.some((group) => (group.uuid ?? UNGROUPED_ID) === picked) ? picked : fallbackId;
  const selected = board.find((group) => (group.uuid ?? UNGROUPED_ID) === selectedId) ?? board[0];

  return (
    <section data-testid="oh-form-groups-board" aria-label="Organise form groups">
      {error ? (
        <p className="mb-4 text-[13px] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {save.isPending ? "Saving order…" : ""}
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={(event) => setActiveKey(String(event.active.id))}
        onDragCancel={() => setActiveKey(null)}
        onDragEnd={onDragEnd}
      >
        <div className="grid items-start gap-8 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-12">
          <div>
            <p className="text-[11.5px] font-semibold tracking-[0.06em] text-dash-muted uppercase">Groups</p>
            <p className="mt-1 text-[12.5px] leading-5 text-dash-muted">Drop a form on a name.</p>
            <ul className="mt-3" aria-label="Groups">
              {board.map((group) => (
                <GroupRailItem
                  key={group.uuid ?? UNGROUPED_ID}
                  group={group}
                  selected={selected !== undefined && (group.uuid ?? UNGROUPED_ID) === selectedId}
                  separated={group.uuid === null && named.length > 0}
                  onSelect={() => setPicked(group.uuid ?? UNGROUPED_ID)}
                />
              ))}
            </ul>
            <form
              className="mt-4 space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                const name = newGroup.trim();
                if (name) create.mutate(name);
              }}
            >
              <Input
                value={newGroup}
                onChange={(event) => setNewGroup(event.target.value)}
                placeholder="New group name"
                aria-label="New group name"
                maxLength={120}
                className="h-9 w-full text-[13.5px]"
              />
              <Button type="submit" variant="primary" className="h-9 w-full text-[13px]" disabled={create.isPending || !newGroup.trim()} data-testid="oh-form-group-create">
                Add group
              </Button>
            </form>
          </div>
          {selected ? (
            <GroupDetail
              key={selected.uuid ?? UNGROUPED_ID}
              group={selected}
              groups={board}
              byKey={byKey}
              busy={busy}
              position={selected.uuid ? named.findIndex((group) => group.uuid === selected.uuid) : -1}
              namedCount={named.length}
              onMoveGroup={(delta) => selected.uuid && apply(moveGroup(board, selected.uuid, delta))}
              onRename={(name) => selected.uuid && rename.mutate({ uuid: selected.uuid, name })}
              onDelete={() => setDeleting(selected)}
              onNudge={(key, delta) => apply(nudgeItem(board, key, delta))}
              onMoveTo={(key, uuid) => {
                const target = board.find((group) => group.uuid === uuid);
                if (!target) return;
                setPicked(uuid ?? UNGROUPED_ID);
                apply(moveItem(board, key, uuid, target.keys.length));
              }}
            />
          ) : null}
        </div>
        <DragOverlay dropAnimation={null}>
          {active ? (
            <div className="border-l-2 border-brand-primary bg-white px-3 py-2 text-[14px] font-semibold text-brand-navy shadow-sm">
              {active.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <AlertDialog.Root open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-brand-navy/40" />
          <AlertDialog.Content className={cn("dialog-content fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-dash-border bg-white p-6 shadow-xl", appFont.className)}>
            <AlertDialog.Title className="text-base font-semibold text-brand-navy">Delete {deleting?.name}?</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-dash-muted">
              {deleting?.keys.length
                ? `Its ${deleting.keys.length} form${deleting.keys.length === 1 ? "" : "s"} will move to Ungrouped. No form is deleted.`
                : "The group is empty. No form is affected."}
            </AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel disabled={remove.isPending} className="rounded-lg border border-dash-border px-3 py-2 text-sm">
                Cancel
              </AlertDialog.Cancel>
              <button
                type="button"
                disabled={remove.isPending}
                data-testid="oh-form-group-delete-confirm"
                className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={() => deleting?.uuid && remove.mutate(deleting.uuid)}
              >
                {remove.isPending ? "Deleting…" : "Delete group"}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  );
}

function GroupRailItem({
  group,
  selected,
  separated,
  onSelect,
}: {
  group: BoardGroup;
  selected: boolean;
  separated: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: railDropId(group.uuid) });
  return (
    <li
      ref={setNodeRef}
      data-testid="oh-form-group-panel"
      data-group={group.uuid ?? UNGROUPED_ID}
      className={cn(separated && "mt-2 border-t border-dash-border pt-2")}
    >
      <button
        type="button"
        aria-label={group.name}
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          "flex w-full items-baseline gap-3 border-l-2 py-2 pr-2 pl-3 text-left",
          selected ? "border-brand-primary bg-brand-tint/70" : "border-transparent hover:bg-dash-canvas/70",
          isOver && "border-brand-primary bg-brand-tint",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate text-[14px] text-brand-navy", selected && "font-semibold")} data-testid="oh-form-group-name">
          {group.name}
        </span>
        <span className="text-[12px] tabular-nums text-dash-muted" aria-hidden="true">{group.keys.length}</span>
      </button>
    </li>
  );
}

function GroupDetail({
  group,
  groups,
  byKey,
  busy,
  position,
  namedCount,
  onMoveGroup,
  onRename,
  onDelete,
  onNudge,
  onMoveTo,
}: {
  group: BoardGroup;
  groups: BoardGroup[];
  byKey: Map<string, BoardItem>;
  busy: boolean;
  position: number;
  namedCount: number;
  onMoveGroup: (delta: -1 | 1) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onNudge: (key: string, delta: -1 | 1) => void;
  onMoveTo: (key: string, uuid: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: groupDropId(group.uuid) });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const isUngrouped = group.uuid === null;
  const rows = group.keys.flatMap((key) => {
    const item = byKey.get(key);
    return item ? [item] : [];
  });

  return (
    <div ref={setNodeRef} className={cn("min-h-72", isOver && rows.length === 0 && "bg-brand-tint/40")}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-dash-border pb-4">
        {editing ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              const next = name.trim();
              if (next && next !== group.name) onRename(next);
              setEditing(false);
            }}
          >
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setName(group.name);
                  setEditing(false);
                }
              }}
              aria-label={`Rename ${group.name}`}
              maxLength={120}
              className="h-9 text-[15px]"
            />
            <IconButton label="Save name" type="submit">
              <Check className="size-3.5" />
            </IconButton>
            <IconButton label="Cancel rename" onClick={() => { setName(group.name); setEditing(false); }}>
              <X className="size-3.5" />
            </IconButton>
          </form>
        ) : (
          <div className="min-w-0">
            <h2 className="truncate text-[22px] font-semibold tracking-tight text-brand-navy">{group.name}</h2>
            <p className="mt-1 text-[13px] text-dash-muted">
              {group.keys.length} {group.keys.length === 1 ? "form" : "forms"}
            </p>
          </div>
        )}
        {!isUngrouped && !editing ? (
          <div className="flex items-center gap-1">
            <TextAction label={`Move ${group.name} up`} disabled={busy || position <= 0} onClick={() => onMoveGroup(-1)}>Up</TextAction>
            <TextAction label={`Move ${group.name} down`} disabled={busy || position >= namedCount - 1} onClick={() => onMoveGroup(1)}>Down</TextAction>
            <TextAction label={`Rename ${group.name}`} onClick={() => { setName(group.name); setEditing(true); }}>Rename</TextAction>
            <TextAction label={`Delete ${group.name}`} disabled={busy} onClick={onDelete} className="hover:text-red-700">Delete</TextAction>
          </div>
        ) : null}
      </header>
      {rows.length === 0 ? (
        <p className={cn("flex min-h-56 items-center justify-center px-6 text-center text-[13.5px]", isOver ? "text-brand-primary" : "text-dash-muted")}>
          {isOver ? "Drop here" : isUngrouped ? "Every form is in a group." : "No forms in this group."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-dash-border text-[11.5px] font-semibold tracking-[0.06em] text-dash-muted uppercase">
                <th className="w-10 px-2 pt-4 pb-2.5 font-semibold"><span className="sr-only">Drag</span></th>
                <th className="px-3 pt-4 pb-2.5 font-semibold">Form</th>
                <th className="px-3 pt-4 pb-2.5 font-semibold">Type</th>
                <th className="px-3 pt-4 pb-2.5 font-semibold">Status</th>
                <th className="w-16 px-2 pt-4 pb-2.5 font-semibold"><span className="sr-only">Order</span></th>
                <th className="w-48 px-3 pt-4 pb-2.5 font-semibold">Move to</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => (
                <FormRow
                  key={item.key}
                  item={item}
                  groups={groups}
                  currentGroup={group.uuid}
                  busy={busy}
                  first={index === 0}
                  last={index === rows.length - 1}
                  onNudge={(delta) => onNudge(item.key, delta)}
                  onMoveTo={(uuid) => onMoveTo(item.key, uuid)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormRow({
  item,
  groups,
  currentGroup,
  busy,
  first,
  last,
  onNudge,
  onMoveTo,
}: {
  item: BoardItem;
  groups: BoardGroup[];
  currentGroup: string | null;
  busy: boolean;
  first: boolean;
  last: boolean;
  onNudge: (delta: -1 | 1) => void;
  onMoveTo: (uuid: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: item.key, disabled: busy });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: itemDropId(item.key) });
  return (
    <tr
      ref={setDropRef}
      data-testid="oh-form-group-item"
      data-key={item.key}
      className={cn(
        "border-b border-dash-border/70 hover:bg-dash-canvas/60",
        isDragging && "opacity-40",
        isOver && !isDragging && "shadow-[inset_0_2px_0_0_var(--color-brand-primary)]",
      )}
    >
      <td className="px-2 py-2.5">
        <div ref={setDragRef} style={{ transform: CSS.Translate.toString(transform) }}>
          <button
            type="button"
            className="cursor-grab touch-none rounded-md p-1 text-dash-muted hover:bg-dash-canvas hover:text-brand-navy active:cursor-grabbing"
            aria-label={`Drag ${item.name}`}
            {...listeners}
            {...attributes}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        </div>
      </td>
      <td className="px-3 py-3 text-[14px] font-semibold text-brand-navy">{item.name}</td>
      <td className="px-3 py-3 text-[13px] text-dash-muted">{item.typeLabel}</td>
      <td className="px-3 py-3 text-[13px] text-dash-muted">{item.statusLabel}</td>
      <td className="px-1 py-2.5">
        <div className="flex items-center">
          <IconButton label={`Move ${item.name} up`} disabled={busy || first} onClick={() => onNudge(-1)}>
            <ArrowUp className="size-3.5" />
          </IconButton>
          <IconButton label={`Move ${item.name} down`} disabled={busy || last} onClick={() => onNudge(1)}>
            <ArrowDown className="size-3.5" />
          </IconButton>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <select
          aria-label={`Move ${item.name} to group`}
          value={currentGroup ?? UNGROUPED_ID}
          disabled={busy}
          onChange={(event) => onMoveTo(event.target.value === UNGROUPED_ID ? null : event.target.value)}
          className="h-8 w-full max-w-48 cursor-pointer truncate rounded-md border border-dash-border bg-white px-2 text-[13px] text-brand-navy outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        >
          {groups.map((group) => (
            <option key={group.uuid ?? UNGROUPED_ID} value={group.uuid ?? UNGROUPED_ID}>
              {group.uuid ? group.name : "Ungrouped"}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}

function TextAction({
  label,
  children,
  className,
  ...props
}: {
  label: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn("px-2 py-1 text-[13px] font-medium text-dash-muted hover:text-brand-navy disabled:opacity-30", className)}
      {...props}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  children,
  className,
  type = "button",
  ...props
}: {
  label: string;
  children: ReactNode;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn("rounded-md p-1.5 text-dash-muted hover:bg-dash-canvas hover:text-brand-navy disabled:opacity-30 disabled:hover:bg-transparent", className)}
      {...props}
    >
      {children}
    </button>
  );
}
