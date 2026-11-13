"use client";

import { useState } from "react";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  OhFormFooter,
  OhPanelSection,
  submitOnModEnter,
} from "@/features/occupational-health/components/OhEncounterColumns";
import { createIodCase, updateIodCase } from "@/features/occupational-health/services/oh.service";
import type { IodCase } from "@/features/occupational-health/types";
import { todayIsoDate } from "@/features/occupational-health/utils/oh-format";
import { appFont } from "@/lib/fonts";
import { useToast } from "@/providers/toast-provider";

const SEVERITIES = [
  { value: "minor", label: "Minor" },
  { value: "moderate", label: "Moderate" },
  { value: "major", label: "Major" },
  { value: "fatal", label: "Fatal" },
] as const;

const SAFETY_CLASSES = [
  { value: "near_miss", label: "Near miss" },
  { value: "first_aid", label: "First aid" },
  { value: "medical_treatment", label: "Medical treatment" },
  { value: "lost_time", label: "Lost time" },
  { value: "fatality", label: "Fatality" },
] as const;

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
] as const;

type OhIodFormProps = {
  encounterId?: number | null;
  customerId: number;
  customerUuid?: string;
  tenantId: number;
  existing?: IodCase;
  onCreated: () => void;
  onSaved?: () => void;
};

export function OhIodForm({
  encounterId,
  customerId,
  customerUuid,
  tenantId,
  existing,
  onCreated,
  onSaved,
}: OhIodFormProps) {
  const { toast } = useToast();
  const [severity, setSeverity] = useState(existing?.severity || "minor");
  const [onsetDate, setOnsetDate] = useState(existing?.onset_date || todayIsoDate);
  const [sheReference, setSheReference] = useState(existing?.she_reference ?? "");
  const [mechanism, setMechanism] = useState(existing?.mechanism ?? "");
  const [bodyPart, setBodyPart] = useState(existing?.body_part ?? "");
  const [incidentLocation, setIncidentLocation] = useState(existing?.incident_location ?? "");
  const [safetyClassification, setSafetyClassification] = useState(existing?.safety_classification || "first_aid");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [status, setStatus] = useState(existing?.status || "open");
  const [lostDays, setLostDays] = useState(existing ? String(existing.lost_days ?? 0) : "0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = Boolean(existing);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!description.trim()) {
      toast({ title: "Describe the incident", variant: "error" });
      return;
    }
    const lost = Number.parseInt(lostDays, 10);
    const payload: Record<string, unknown> = {
      severity,
      onset_date: onsetDate,
      description: description.trim(),
      she_reference: sheReference.trim(),
      mechanism: mechanism.trim(),
      body_part: bodyPart.trim(),
      incident_location: incidentLocation.trim(),
      safety_classification: safetyClassification,
      work_related: true,
      status,
      lost_days: Number.isFinite(lost) && lost >= 0 ? lost : 0,
    };
    setIsSubmitting(true);
    try {
      if (existing) {
        await updateIodCase(existing.uuid, payload);
        toast({ variant: "success", title: "IOD case updated" });
        (onSaved ?? onCreated)();
      } else {
        await createIodCase({
          ...payload,
          tenant: tenantId,
          customer: customerId,
          customer_uuid: customerUuid,
          ...(encounterId != null ? { encounter: encounterId } : {}),
        });
        setDescription("");
        setSheReference("");
        setMechanism("");
        setBodyPart("");
        setIncidentLocation("");
        toast({ variant: "success", title: "IOD case opened" });
        onCreated();
      }
    } catch (error) {
      toast({
        title: existing ? "Could not update IOD case" : "Could not create IOD case",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <OhPanelSection description={isEdit ? "Update this injury-on-duty case." : "Open an injury-on-duty case linked to this visit."}>
      <form
        onSubmit={(event) => void handleSubmit(event)}
        onKeyDown={submitOnModEnter}
        className="space-y-4"
        data-testid="oh-iod-form"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="oh-iod-severity">
              Severity <RequiredFieldMarker />
            </Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger id="oh-iod-severity" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={appFont.className}>
                {SEVERITIES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oh-iod-onset">
              Onset date <RequiredFieldMarker />
            </Label>
            <Input
              id="oh-iod-onset"
              type="date"
              max={todayIsoDate()}
              value={onsetDate}
              onChange={(event) => setOnsetDate(event.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oh-iod-safety">
            Safety classification <RequiredFieldMarker />
          </Label>
          <Select value={safetyClassification} onValueChange={setSafetyClassification}>
            <SelectTrigger id="oh-iod-safety" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={appFont.className}>
              {SAFETY_CLASSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="oh-iod-mechanism">Mechanism</Label>
            <Input
              id="oh-iod-mechanism"
              value={mechanism}
              onChange={(event) => setMechanism(event.target.value)}
              placeholder="e.g. slip"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oh-iod-body-part">Body part</Label>
            <Input
              id="oh-iod-body-part"
              value={bodyPart}
              onChange={(event) => setBodyPart(event.target.value)}
              placeholder="e.g. right hand"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oh-iod-location">Incident location</Label>
          <Input
            id="oh-iod-location"
            value={incidentLocation}
            onChange={(event) => setIncidentLocation(event.target.value)}
            placeholder="Where on site it happened"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oh-iod-she-ref">SHE reference</Label>
          <Input
            id="oh-iod-she-ref"
            value={sheReference}
            onChange={(event) => setSheReference(event.target.value)}
            placeholder="Employer / SHE case reference"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="oh-iod-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="oh-iod-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={appFont.className}>
                {STATUSES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oh-iod-lost-days">Days off</Label>
            <Input
              id="oh-iod-lost-days"
              type="number"
              min={0}
              step={1}
              value={lostDays}
              onChange={(event) => setLostDays(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oh-iod-description">
            Description <RequiredFieldMarker />
          </Label>
          <Textarea
            id="oh-iod-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            required
          />
        </div>
        <OhFormFooter>
          <PrimaryButton type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isEdit ? "Save" : "Open case"}
          </PrimaryButton>
        </OhFormFooter>
      </form>
    </OhPanelSection>
  );
}
