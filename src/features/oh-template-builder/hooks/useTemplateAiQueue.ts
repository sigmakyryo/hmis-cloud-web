"use client";

import { useEffect, useRef, useState } from "react";
import { applyCofTemplateAiOperations, type CofTemplateAiOperation, type CofTemplateAiApplyResponse } from "@/features/oh-template-builder/lib/templateAi";
import { getErrorMessage } from "@/lib/fetch-error";

/** A queue belongs to one mounted template session, not a global studio store. */
export function useTemplateAiQueue(templateUuid: string) {
  const [note, setNote] = useState("");
  const active = useRef(true);
  const queue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  function enqueue(input: CofTemplateAiOperation | CofTemplateAiOperation[]) {
    const operations = Array.isArray(input) ? input : [input];
    const task = queue.current.then(async (): Promise<(CofTemplateAiApplyResponse & { uncertain?: boolean }) | null> => {
      if (!active.current) return null;
      try {
        const result = await applyCofTemplateAiOperations(templateUuid, { operations });
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
