"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import {
  recordIodFormSchema,
  type RecordIodFormValues,
} from "@/features/occupational-health/iod-case/iod-from-visit.schema";
import {
  iodForEncounterKey,
  recordIodFromEncounter,
} from "@/features/occupational-health/iod-case/iod-from-visit.service";
import { todayIsoDate } from "@/features/occupational-health/utils/oh-format";
import { appFont } from "@/lib/fonts";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage } from "@/lib/bff-field-errors";
import { useToast } from "@/providers/toast-provider";

type RecordIodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitUuid: string;
  encounterUuid: string;
  /** Day the encounter started (ISO), used as the default incident date. */
  startedAt: string | null | undefined;
  /** Only OH staff can open the case; other clinicians stay on the visit. */
  canOpenCase: boolean;
};

export function RecordIodDialog(props: RecordIodDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className={appFont.className}>
        {props.open ? <RecordIodForm {...props} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function defaultIncidentDate(startedAt: string | null | undefined): string {
  const today = todayIsoDate();
  const started = startedAt?.slice(0, 10) ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(started) && started <= today ? started : today;
}

function RecordIodForm({
  onOpenChange,
  visitUuid,
  encounterUuid,
  startedAt,
  canOpenCase,
}: RecordIodDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { register, handleSubmit, formState } = useForm<RecordIodFormValues>({
    resolver: zodResolver(recordIodFormSchema),
    defaultValues: { onset_date: defaultIncidentDate(startedAt), note: "" },
  });

  const record = useMutation({
    mutationFn: (values: RecordIodFormValues) =>
      recordIodFromEncounter({
        visit_uuid: visitUuid,
        encounter_uuid: encounterUuid,
        onset_date: values.onset_date,
        note: values.note.trim() || undefined,
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: iodForEncounterKey(encounterUuid) });
      toast({
        variant: "success",
        title: "Injury on duty recorded",
        description: "The case is linked to this visit and will be written up from the visit record.",
      });
      onOpenChange(false);
      if (canOpenCase) {
        router.push(ROUTES.occupationalHealthRecord("iod", created.uuid));
      }
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not record the injury on duty",
        description:
          error instanceof BffError
            ? formatBffErrorMessage(error.message, error.errors)
            : undefined,
      }),
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit((values) => record.mutate(values))}>
      <DialogHeader>
        <DialogTitle>Record injury on duty</DialogTitle>
        <DialogDescription>
          This opens an injury-on-duty case linked to this visit. The details are drafted from what is documented
          on the visit, and you can review them on the case.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label htmlFor="record-iod-date">
          Incident date <RequiredFieldMarker />
        </Label>
        <Input id="record-iod-date" type="date" max={todayIsoDate()} {...register("onset_date")} />
        {formState.errors.onset_date ? (
          <p className="text-xs text-red-700" role="alert">
            {formState.errors.onset_date.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="record-iod-note">What happened (optional)</Label>
        <Textarea
          id="record-iod-note"
          rows={4}
          placeholder="A few words on how the injury happened. Leave blank to have it drafted from the visit record."
          {...register("note")}
        />
        {formState.errors.note ? (
          <p className="text-xs text-red-700" role="alert">
            {formState.errors.note.message}
          </p>
        ) : null}
      </div>
      <DialogFooter className="gap-2 sm:gap-2">
        <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={record.isPending}>
          {record.isPending ? "Recording…" : "Record injury on duty"}
        </PrimaryButton>
      </DialogFooter>
    </form>
  );
}
