"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { CheckField, Field } from "@/app/(app)/immunizations/_components/shared/Field";
import type { ExposureGroup } from "@/features/exposure-management/exposure.types";
import { errorMessage } from "@/features/exposure-management/lib/exposure-format";
import { createGroup, exposureKeys, updateGroup } from "@/features/exposure-management/services/exposure.service";

/** Create or edit a similar exposure group. At least one membership rule is required, matching the server. */
export function ExposureGroupSheet({ group, onClose }: { group?: ExposureGroup; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    code: group?.code ?? "",
    name: group?.name ?? "",
    site: group?.site ?? "",
    department: group?.department ?? "",
    job_title: group?.job_title ?? "",
    owner_name: group?.owner_name ?? "",
    description: group?.description ?? "",
    is_active: group?.is_active ?? true,
  });
  const [error, setError] = useState("");
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const hasRule = Boolean(form.site.trim() || form.department.trim() || form.job_title.trim());

  const save = useMutation({
    mutationFn: () => (group ? updateGroup(group.uuid, form) : createGroup(form)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: exposureKeys.groups });
      void qc.invalidateQueries({ queryKey: exposureKeys.dashboard });
      if (group) void qc.invalidateQueries({ queryKey: exposureKeys.group(group.uuid) });
      onClose();
    },
    onError: (e) => setError(errorMessage(e, "Could not save the group.")),
  });

  return (
    <Drawer title={group ? "Edit exposure group" : "New exposure group"} description="Workers are placed in the group by the rules below; membership is never stored by hand." onClose={onClose}>
      <Field label="Code" required value={form.code} onChange={set("code")} />
      <Field label="Name" required value={form.name} onChange={set("name")} />
      <Field label="Site" value={form.site} onChange={set("site")} />
      <Field label="Department" value={form.department} onChange={set("department")} />
      <Field label="Job title" value={form.job_title} onChange={set("job_title")} />
      <Field label="Owner" value={form.owner_name} onChange={set("owner_name")} />
      <div className="space-y-1.5">
        <label htmlFor="exposure-group-desc" className="text-sm font-medium">Description</label>
        <Textarea id="exposure-group-desc" rows={3} value={form.description} onChange={(e) => set("description")(e.target.value)} />
      </div>
      <CheckField label="Active" checked={form.is_active} onChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))} />
      {!hasRule ? <p className="text-[13px] text-amber-800">Add a site, department or job title so the group has members.</p> : null}
      {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton type="button" disabled={save.isPending || !form.code.trim() || !form.name.trim() || !hasRule} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save group"}
        </PrimaryButton>
      </DrawerActions>
    </Drawer>
  );
}
