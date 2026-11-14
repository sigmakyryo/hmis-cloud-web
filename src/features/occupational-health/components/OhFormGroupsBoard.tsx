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
import { ArrowDown, ArrowUp, Check, FolderPlus, GripVertical, Pencil, Trash2, X } from "lucide-react";
import { AlertDialog } from "radix-ui";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
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
const itemDropId = (key: string) => `item:${key}`;

/** Prefer a card under the pointer (insert before it), then the group under it (append). */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const card = hits.find((hit) => String(hit.id).startsWith("item:"));
  if (card) return [card];
  return hits.length > 0 ? hits : rectIntersection(args);
};

export function OhFormGroupsBoard({ items, groups, onChanged }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const byKey = useMemo(() => new Map(items.map((item) => [item.key, item])), [items]);
  const saved = useMemo(() => buildBoard(items, groups), [items, groups]);
  const [draft, setDraft] = useState<BoardGroup[] | null>(null);
  const board = draft ?? saved;
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState("");
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
    onSuccess: async () => {
      setNewGroup("");
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
      const overKey = overId.slice(5);
      if (overKey === key) return;
      const target = groupOf(board, overKey);
      if (!target) return;
      // Inserts before the hovered card (moveItem removes the dragged card first).
      const without = target.keys.filter((k) => k !== key);
      apply(moveItem(board, key, target.uuid, without.indexOf(overKey)));
      return;
    }
    const groupId = overId.slice(6);
    const uuid = groupId === UNGROUPED_ID ? null : groupId;
    const target = board.find((group) => group.uuid === uuid);
    if (!target) return;
    if (groupOf(board, key)?.uuid === uuid && target.keys.at(-1) === key) return;
    apply(moveItem(board, key, uuid, target.keys.length));
  };

  const named = board.filter((group) => group.uuid !== null);
  const active = activeKey ? byKey.get(activeKey) : undefined;

  return (
    <section className="space-y-4" data-testid="oh-form-groups-board" aria-label="Organise form groups">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-brand-navy">Organise groups</h2>
          <p className="text-[12px] text-dash-muted">
            Drag a form by its handle to reorder it or move it to another group. Arrow buttons and “Move to” do the same from the keyboard.
          </p>
        </div>
        <form
          className="flex items-center gap-2"
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
            className="h-8 w-52 text-[13px]"
          />
          <PrimaryButton type="submit" disabled={create.isPending || !newGroup.trim()} data-testid="oh-form-group-create">
            <FolderPlus className="size-4" aria-hidden="true" />
            Add group
          </PrimaryButton>
        </form>
      </div>
      {error ? (
        <p className="text-[13px] text-red-700" role="alert">
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
        <div className="grid gap-4 lg:grid-cols-2">
          {board.map((group) => (
            <GroupPanel
              key={group.uuid ?? UNGROUPED_ID}
              group={group}
              groups={board}
              byKey={byKey}
              busy={busy}
              position={group.uuid ? named.findIndex((g) => g.uuid === group.uuid) : -1}
              namedCount={named.length}
              dragging={activeKey !== null}
              onMoveGroup={(delta) => group.uuid && apply(moveGroup(board, group.uuid, delta))}
              onRename={(name) => group.uuid && rename.mutate({ uuid: group.uuid, name })}
              onDelete={() => setDeleting(group)}
              onNudge={(key, delta) => apply(nudgeItem(board, key, delta))}
              onMoveTo={(key, uuid) => {
                const target = board.find((g) => g.uuid === uuid);
                if (target) apply(moveItem(board, key, uuid, target.keys.length));
              }}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {active ? <FormCardBody item={active} className="rotate-1 shadow-lg ring-2 ring-brand-primary/40" /> : null}
        </DragOverlay>
      </DndContext>
      <AlertDialog.Root open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
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

function GroupPanel({
  group,
  groups,
  byKey,
  busy,
  position,
  namedCount,
  dragging,
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
  dragging: boolean;
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

  return (
    <div
      ref={setNodeRef}
      data-testid="oh-form-group-panel"
      data-group={group.uuid ?? UNGROUPED_ID}
      className={cn(
        "flex flex-col rounded-xl border bg-white transition-colors",
        isUngrouped ? "border-dashed border-dash-border bg-dash-canvas/60" : "border-dash-border",
        isOver && "border-brand-primary bg-brand-primary/5",
      )}
    >
      <header className="flex items-center gap-2 border-b border-dash-border px-3 py-2">
        {editing ? (
          <form
            className="flex flex-1 items-center gap-1"
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
              className="h-7 text-[13px]"
            />
            <IconButton label="Save name" type="submit">
              <Check className="size-3.5" />
            </IconButton>
            <IconButton label="Cancel rename" onClick={() => { setName(group.name); setEditing(false); }}>
              <X className="size-3.5" />
            </IconButton>
          </form>
        ) : (
          <>
            <h3 className="flex-1 truncate text-[13px] font-semibold text-brand-navy" data-testid="oh-form-group-name">
              {group.name}
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-dash-muted">
              {group.keys.length}
            </span>
            {!isUngrouped ? (
              <div className="flex items-center">
                <IconButton label={`Move ${group.name} up`} disabled={busy || position <= 0} onClick={() => onMoveGroup(-1)}>
                  <ArrowUp className="size-3.5" />
                </IconButton>
                <IconButton label={`Move ${group.name} down`} disabled={busy || position >= namedCount - 1} onClick={() => onMoveGroup(1)}>
                  <ArrowDown className="size-3.5" />
                </IconButton>
                <IconButton label={`Rename ${group.name}`} onClick={() => { setName(group.name); setEditing(true); }}>
                  <Pencil className="size-3.5" />
                </IconButton>
                <IconButton label={`Delete ${group.name}`} disabled={busy} onClick={onDelete} className="hover:text-red-700">
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            ) : null}
          </>
        )}
      </header>
      <ul className="flex min-h-16 flex-1 flex-col gap-1.5 p-2" aria-label={`Forms in ${group.name}`}>
        {group.keys.map((key, index) => {
          const item = byKey.get(key);
          if (!item) return null;
          return (
            <FormCard
              key={key}
              item={item}
              groups={groups}
              currentGroup={group.uuid}
              busy={busy}
              first={index === 0}
              last={index === group.keys.length - 1}
              onNudge={(delta) => onNudge(key, delta)}
              onMoveTo={(uuid) => onMoveTo(key, uuid)}
            />
          );
        })}
        {group.keys.length === 0 ? (
          <li className={cn("rounded-lg border border-dashed border-dash-border px-3 py-4 text-center text-[12px] text-dash-muted", dragging && "border-brand-primary text-brand-primary")}>
            {dragging ? "Drop here" : isUngrouped ? "Every form is in a group." : "No forms yet. Drag one here."}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function FormCard({
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
    <li
      ref={setDropRef}
      className={cn("relative", isOver && !isDragging && "before:absolute before:-top-1 before:left-2 before:right-2 before:h-0.5 before:rounded before:bg-brand-primary")}
      data-testid="oh-form-group-item"
      data-key={item.key}
    >
      <div ref={setDragRef} style={{ transform: CSS.Translate.toString(transform) }} className={cn(isDragging && "opacity-40")}>
        <FormCardBody
          item={item}
          handle={
            <button
              type="button"
              className="cursor-grab touch-none rounded p-1 text-dash-muted hover:bg-slate-100 hover:text-brand-navy active:cursor-grabbing"
              aria-label={`Drag ${item.name}`}
              {...listeners}
              {...attributes}
            >
              <GripVertical className="size-4" aria-hidden="true" />
            </button>
          }
          actions={
            <div className="flex items-center">
              <IconButton label={`Move ${item.name} up`} disabled={busy || first} onClick={() => onNudge(-1)}>
                <ArrowUp className="size-3.5" />
              </IconButton>
              <IconButton label={`Move ${item.name} down`} disabled={busy || last} onClick={() => onNudge(1)}>
                <ArrowDown className="size-3.5" />
              </IconButton>
              <select
                aria-label={`Move ${item.name} to group`}
                value={currentGroup ?? UNGROUPED_ID}
                disabled={busy}
                onChange={(event) => onMoveTo(event.target.value === UNGROUPED_ID ? null : event.target.value)}
                className="ml-1 max-w-32 rounded-md border border-dash-border bg-white px-1.5 py-1 text-[11px] text-dash-muted"
              >
                {groups.map((group) => (
                  <option key={group.uuid ?? UNGROUPED_ID} value={group.uuid ?? UNGROUPED_ID}>
                    {group.uuid ? group.name : "Ungrouped"}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      </div>
    </li>
  );
}

function FormCardBody({
  item,
  handle,
  actions,
  className,
}: {
  item: BoardItem;
  handle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border border-dash-border bg-white px-2 py-1.5", className)}>
      {handle ?? <GripVertical className="size-4 text-dash-muted" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-brand-navy">{item.name}</p>
        <p className="text-[11px] text-dash-muted">
          {item.typeLabel} · {item.statusLabel}
        </p>
      </div>
      {actions}
    </div>
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
  children: React.ReactNode;
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
      className={cn("rounded p-1 text-dash-muted hover:bg-slate-100 hover:text-brand-navy disabled:opacity-30 disabled:hover:bg-transparent", className)}
      {...props}
    >
      {children}
    </button>
  );
}
