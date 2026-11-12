"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import { ImmEmployeeLink } from "@/app/(app)/immunizations/_components/shared/ImmEmployeeLink";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { fetchFitCourses, recordFitTraining } from "@/features/occupational-health/services/fitness.service";
import { useToast } from "@/providers/toast-provider";
import { FitnessSummaryView, useFitWorker } from "../shared/FitnessSummary";
import { errorText, today } from "../shared/fit-format";

export function FitWorkerDrawer({ customerUuid, onClose }: { customerUuid: string; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const worker = useFitWorker(customerUuid);
  const [adding, setAdding] = useState(false);
  const [course, setCourse] = useState("");
  const [issued, setIssued] = useState(today());
  const [provider, setProvider] = useState("");
  const courses = useQuery({ queryKey: ["oh-fit", "courses"], queryFn: fetchFitCourses, enabled: adding });

  const save = useMutation({
    mutationFn: () => recordFitTraining({ customer_uuid: customerUuid, course_uuid: course, issued_on: issued, provider }),
    onSuccess: () => {
      toast({ variant: "success", title: "Training saved" });
      setAdding(false);
      setCourse("");
      void client.invalidateQueries({ queryKey: ["oh-fit"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });

  const name = worker.data?.worker_label || "Worker";
  return (
    <Drawer
      title={name}
      description={worker.data ? [worker.data.job_title, worker.data.employer_name, worker.data.site].filter(Boolean).join(" · ") : undefined}
      onClose={onClose}
      wide
    >
      <div className="flex justify-end">
        <ImmEmployeeLink uuid={customerUuid} />
      </div>
      {worker.isLoading ? <QuietLoading /> : null}
      {worker.isError ? <LoadError>{errorText(worker.error, "Could not load this worker.")}</LoadError> : null}
      {worker.data ? <FitnessSummaryView worker={worker.data} /> : null}
      {adding ? (
        <div className="space-y-3 border-t border-dash-border pt-3" data-testid="oh-fit-add-training">
          <SelectField label="Course" value={course} onChange={setCourse} required>
            <option value="">Choose a course</option>
            {(courses.data ?? []).map((c) => (
              <option key={c.uuid} value={c.uuid}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <Field label="Date passed" type="date" value={issued} onChange={setIssued} required />
          <Field label="Training provider" value={provider} onChange={setProvider} />
          <DrawerActions>
            <SecondaryButton size="sm" onClick={() => setAdding(false)}>
              Cancel
            </SecondaryButton>
            <PageActionButton disabled={!course || !issued || save.isPending} onClick={() => save.mutate()}>
              Save training
            </PageActionButton>
          </DrawerActions>
        </div>
      ) : (
        <DrawerActions>
          <SecondaryButton size="sm" onClick={() => setAdding(true)}>
            Add training
          </SecondaryButton>
        </DrawerActions>
      )}
    </Drawer>
  );
}
