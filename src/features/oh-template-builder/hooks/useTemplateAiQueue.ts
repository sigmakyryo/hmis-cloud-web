"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplateKind } from "@/features/oh-template-builder/template-builder.types";
import { applyEmployeeFormTemplateAiOperations, applyExamTemplateAiOperations, applyCofTemplateAiOperations, type CofTemplateAiOperation, type CofTemplateAiApplyResponse } from "@/features/oh-template-builder/lib/templateAi";
import { droppedAiErrors, filterAiOperations } from "@/features/oh-template-builder/lib/dedicatedOhRecordPages";
import { getErrorMessage } from "@/lib/fetch-error";

/** A queue belongs to one mounted template session, not a global studio store. */
export function useTemplateAiQueue(templateUuid: string, kind: TemplateKind = "certificate") {
  const [note, setNote] = useState("");
  const active = useRef(true);
  const queue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  function enqueue(input: CofTemplateAiOperation | CofTemplateAiOperation[]) {
    const incoming = Array.isArray(input) ? input : [input];
    const filtered = filterAiOperations(incoming);
    const operations = filtered.operations;
    const reservedErrors = droppedAiErrors(filtered.dropped);
    const task = queue.current.then(async (): Promise<(CofTemplateAiApplyResponse & { uncertain?: boolean }) | null> => {
      if (!active.current) return null;
      if (operations.length === 0) {
        if (active.current && reservedErrors.length) setNote(reservedErrors.join("\n"));
        return { applied: [], errors: reservedErrors };
      }
      try {
        const apply = kind === "exam" ? applyExamTemplateAiOperations : kind === "employee" ? applyEmployeeFormTemplateAiOperations : applyCofTemplateAiOperations;
        const result = await apply(templateUuid, { operations });
        if (reservedErrors.length) {
          result.errors = [...reservedErrors, ...(result.errors ?? [])];
        }
        if (active.current && result.errors?.length) setNote(result.errors.join("\n"));
        return result;
      } catch (error: unknown) {
        const message = `Save could not be confirmed. Review before retrying. ${getErrorMessage(error, "The draft could not be saved.")}`;
        if (active.current) setNote(message);
        return { applied: [], errors: [message], uncertain: true };
      }
    });
    queue.current = task.then(() => undefined);
    return task;
  }

  return { enqueue, whenIdle: () => queue.current, note, setNote };
}
