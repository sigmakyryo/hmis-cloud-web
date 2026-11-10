import { fieldOwnerKey, type ExamTemplateAnswers, type ExamTemplateSnapshot } from "@/features/occupational-health/lib/exam-template-snapshot";
import type { OhResponseField } from "@/features/occupational-health/types";

export type CofDraftTarget = { owner: string; code: string; label: string };

export type CofDraftTargets = {
  wording: CofDraftTarget | null;
  restrictions: CofDraftTarget | null;
};

const FREE_TEXT_TYPES = new Set(["text", "textarea", "long_text"]);
const RESTRICTION_LABEL = /restrict|limitation/i;
const WORDING_LABEL = /wording|comment|remark|statement|summary|note|recommend|conclusion|opinion/i;

function isFreeText(field: OhResponseField): boolean {
  return FREE_TEXT_TYPES.has(field.response_type) && !(field.options?.length);
}

/** Free-text fields on the open certificate form that the drafted write-up can fill, matched by label. */
export function findCofDraftTargets(snapshot: ExamTemplateSnapshot, answers: ExamTemplateAnswers): CofDraftTargets {
  const candidates: CofDraftTarget[] = [];
  for (const section of snapshot.sections) {
    if (section.content_mode === "direct") {
      for (const field of section.response_fields ?? []) {
        if (isFreeText(field)) candidates.push({ owner: section.code, code: field.code, label: field.label });
      }
      continue;
    }
    const picks = answers.picks[section.code] ?? [];
    for (const item of section.items) {
      if (!picks.includes(item.code)) continue;
      for (const field of item.response_fields) {
        if (field.prompt_after_select === false || !isFreeText(field)) continue;
        candidates.push({ owner: fieldOwnerKey(section.code, item.code), code: field.code, label: field.label });
      }
    }
  }
  const restrictions = candidates.find((target) => RESTRICTION_LABEL.test(target.label)) ?? null;
  const wording =
    candidates.find((target) => target !== restrictions && WORDING_LABEL.test(target.label) && !RESTRICTION_LABEL.test(target.label)) ?? null;
  return { wording, restrictions };
}

/** Writes the drafted wording and restriction lines into the matched fields. Unmatched parts are left alone. */
export function applyCofDraft(
  answers: ExamTemplateAnswers,
  targets: CofDraftTargets,
  draft: { wording?: string; restrictions?: string[] },
): ExamTemplateAnswers {
  const fields = { ...answers.fields };
  const write = (target: CofDraftTarget | null, value: string) => {
    if (!target || value.trim() === "") return;
    fields[target.owner] = { ...fields[target.owner], [target.code]: value };
  };
  write(targets.wording, draft.wording?.trim() ?? "");
  write(targets.restrictions, (draft.restrictions ?? []).map((line) => line.trim()).filter(Boolean).join("\n"));
  return { ...answers, fields };
}
