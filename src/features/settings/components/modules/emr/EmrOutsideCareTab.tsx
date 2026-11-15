"use client";

import { useState } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import {
  useArchiveSettingsOutsideHospital,
  useArchiveSettingsReferenceKind,
  useSaveSettingsOutsideHospital,
  useSaveSettingsReferenceKind,
  useSettingsOutsideHospitals,
  useSettingsReferenceKinds,
} from "@/features/clinical-opd/hooks/use-external-care";
import type { ExternalReferenceKind } from "@/features/clinical-opd/types/external-care.types";
import { SettingsContentSkeleton } from "@/features/settings/components/SettingsContentSkeleton";
import { SettingsSection } from "@/features/settings/components/SettingsPageLayout";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage } from "@/lib/bff-field-errors";
import { useToast } from "@/providers/toast-provider";

const EMPTY_HOSPITAL = { name: "", town: "", phone: "" };

export function EmrOutsideCareTab() {
  const { toast } = useToast();
  const hospitals = useSettingsOutsideHospitals();
  const kinds = useSettingsReferenceKinds();
  const saveHospital = useSaveSettingsOutsideHospital();
  const archiveHospital = useArchiveSettingsOutsideHospital();
  const saveKind = useSaveSettingsReferenceKind();
  const archiveKind = useArchiveSettingsReferenceKind();
  const [hospitalDraft, setHospitalDraft] = useState(EMPTY_HOSPITAL);
  const [editingHospital, setEditingHospital] = useState<string | undefined>();
  const [kindLabel, setKindLabel] = useState("");
  const [kindScope, setKindScope] = useState<ExternalReferenceKind["scope"]>("encounter");
  const [editingKind, setEditingKind] = useState<string | undefined>();

  if (hospitals.isLoading || kinds.isLoading) {
    return <SettingsContentSkeleton variant="form" />;
  }

  async function submitHospital() {
    const name = hospitalDraft.name.trim();
    if (!name) {
      toast({ title: "Enter the hospital name", variant: "error" });
      return;
    }
    try {
      await saveHospital.mutateAsync({
        hospitalUuid: editingHospital,
        input: {
          name,
          town: hospitalDraft.town.trim(),
          phone: hospitalDraft.phone.trim(),
        },
      });
      setHospitalDraft(EMPTY_HOSPITAL);
      setEditingHospital(undefined);
      toast({ title: "Hospital saved", variant: "success" });
    } catch (error) {
      toast({
        title: "Could not save the hospital",
        description:
          error instanceof BffError
            ? formatBffErrorMessage(error.message, error.errors)
            : "Try again.",
        variant: "error",
      });
    }
  }

  async function submitKind() {
    const label = kindLabel.trim();
    if (!label) {
      toast({ title: "Enter the reference label", variant: "error" });
      return;
    }
    try {
      await saveKind.mutateAsync({
        kindUuid: editingKind,
        input: { label, scope: kindScope },
      });
      setKindLabel("");
      setKindScope("encounter");
      setEditingKind(undefined);
      toast({ title: "Reference kind saved", variant: "success" });
    } catch (error) {
      toast({
        title: "Could not save the reference kind",
        description:
          error instanceof BffError
            ? formatBffErrorMessage(error.message, error.errors)
            : "Try again.",
        variant: "error",
      });
    }
  }

  return (
    <div className="space-y-8" data-testid="emr-outside-care-tab">
      <SettingsSection
        title="Outside hospitals"
        description="Hospitals that are not part of this organisation. Visits can pick from this list."
      >
        <ul className="divide-y divide-brand-border">
          {(hospitals.data ?? []).map((hospital) => (
            <li key={hospital.uuid} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-brand-navy">{hospital.name}</p>
                <p className="text-[13px] text-slate-400">
                  {[hospital.town, hospital.phone].filter(Boolean).join(" · ") || "No town or phone"}
                </p>
              </div>
              <div className="flex gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setEditingHospital(hospital.uuid);
                    setHospitalDraft({
                      name: hospital.name,
                      town: hospital.town,
                      phone: hospital.phone,
                    });
                  }}
                >
                  Edit
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  disabled={archiveHospital.isPending}
                  onClick={() => {
                    void archiveHospital.mutateAsync(hospital.uuid).catch((error: unknown) => {
                      toast({
                        title: "Could not archive the hospital",
                        description:
                          error instanceof BffError
                            ? formatBffErrorMessage(error.message, error.errors)
                            : "Try again.",
                        variant: "error",
                      });
                    });
                  }}
                >
                  Archive
                </SecondaryButton>
              </div>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="settings-hospital-name">
              Name <RequiredFieldMarker />
            </Label>
            <Input
              id="settings-hospital-name"
              value={hospitalDraft.name}
              onChange={(event) =>
                setHospitalDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-hospital-town">Town</Label>
            <Input
              id="settings-hospital-town"
              value={hospitalDraft.town}
              onChange={(event) =>
                setHospitalDraft((current) => ({ ...current, town: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-hospital-phone">Phone</Label>
            <Input
              id="settings-hospital-phone"
              value={hospitalDraft.phone}
              onChange={(event) =>
                setHospitalDraft((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </div>
        </div>
        <PrimaryButton
          type="button"
          disabled={saveHospital.isPending}
          onClick={() => void submitHospital()}
        >
          {editingHospital ? "Update hospital" : "Add hospital"}
        </PrimaryButton>
      </SettingsSection>

      <SettingsSection
        title="Reference kinds"
        description="Labels for numbers this clinic records from somewhere else."
      >
        <ul className="divide-y divide-brand-border">
          {(kinds.data ?? []).map((kind) => (
            <li key={kind.uuid} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-brand-navy">{kind.label}</p>
                <p className="text-[13px] text-slate-400">
                  {kind.scope === "visit" ? "Whole visit" : "One encounter"}
                </p>
              </div>
              <div className="flex gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setEditingKind(kind.uuid);
                    setKindLabel(kind.label);
                    setKindScope(kind.scope);
                  }}
                >
                  Edit
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  disabled={archiveKind.isPending}
                  onClick={() => {
                    void archiveKind.mutateAsync(kind.uuid).catch((error: unknown) => {
                      toast({
                        title: "Could not archive the reference kind",
                        description:
                          error instanceof BffError
                            ? formatBffErrorMessage(error.message, error.errors)
                            : "Try again.",
                        variant: "error",
                      });
                    });
                  }}
                >
                  Archive
                </SecondaryButton>
              </div>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-kind-label">
              Label <RequiredFieldMarker />
            </Label>
            <Input
              id="settings-kind-label"
              value={kindLabel}
              onChange={(event) => setKindLabel(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-kind-scope">Belongs to</Label>
            <select
              id="settings-kind-scope"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={kindScope}
              onChange={(event) =>
                setKindScope(event.target.value as ExternalReferenceKind["scope"])
              }
            >
              <option value="encounter">One encounter</option>
              <option value="visit">Whole visit</option>
            </select>
          </div>
        </div>
        <PrimaryButton
          type="button"
          disabled={saveKind.isPending}
          onClick={() => void submitKind()}
        >
          {editingKind ? "Update kind" : "Add kind"}
        </PrimaryButton>
      </SettingsSection>
    </div>
  );
}
