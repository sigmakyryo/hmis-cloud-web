"use client";

import { useEffect, useRef, useState } from "react";
import { applyCofTemplateAiOperations, type CofTemplateAiOperation } from "@/features/oh-template-builder/lib/templateAi";
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

  function enqueue(operation: CofTemplateAiOperation) {
    // Capture both identity and operation before the stream yields again.
    queue.current = queue.current.then(async () => {
      if (!active.current) return;
      const result = await applyCofTemplateAiOperations(templateUuid, { operations: [operation] });
      if (active.current && result.errors?.length) setNote(result.errors.join(" "));
    }).catch((error: unknown) => {
      if (active.current) setNote(getErrorMessage(error, "The draft could not be saved."));
    });
  }

  return { enqueue, whenIdle: () => queue.current, note, setNote };
}
