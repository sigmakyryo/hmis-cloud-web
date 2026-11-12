import { normalizeResponseFields } from "@/features/settings/components/modules/occupational-health/template-library/responseConfig";
import type { OhResponseField } from "@/features/occupational-health/types";

export type ExamTemplateSnapshotItem = {
  uuid?: string;
  code: string;
  name: string;
  sort_order?: number;
  inherits?: boolean;
  response_definitions_missing?: boolean;
  response_fields: OhResponseField[];
};

export type ExamTemplateSnapshotSection = {
  source_uuid?: string;
  code: string;
  name: string;
  content_mode: "items" | "direct" | string;
  is_mandatory?: boolean;
  selection_mode?: "exclusive" | "inclusive" | string;
  sort_order?: number;
  response_definitions_missing?: boolean;
  response_fields?: OhResponseField[];
  items: ExamTemplateSnapshotItem[];
};

export type ExamTemplateSnapshot = {
  schema_version?: number;
  sections: ExamTemplateSnapshotSection[];
};

export type ExamTemplateAnswers = {
  /** Picked item codes per section code. */
  picks: Record<string, string[]>;
  /** Field values keyed by `${sectionCode}` (direct) or `${sectionCode}:${itemCode}`. */
  fields: Record<string, Record<string, string>>;
};

export type ExamTemplateResponseEnvelope = {
  template_uuid: string;
  template_name?: string;
  version_number?: number | null;
  template_version_uuid?: string | null;
  hazard_profile_id?: number | null;
  answers: ExamTemplateAnswers;
};

function publishedFields(raw: unknown): OhResponseField[] {
  const rows = (Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : []).filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && Object.keys(row).length > 0);
  return normalizeResponseFields(rows).map((field, index) => {
    const original = rows[index] as Record<string, unknown> | undefined;
    return {
      ...field,
      code: typeof original?.code === "string" && original.code ? original.code : field.code,
      label: typeof original?.label === "string" && original.label ? original.label : field.label,
      options: Array.isArray(original?.options) ? original.options.filter((option): option is Record<string, unknown> => Boolean(option) && typeof option === "object").map((option) => ({ code: String(option.code ?? ""), label: String(option.label ?? "") })) : field.options,
    };
  });
}

export function parseExamTemplateSnapshot(raw: unknown): ExamTemplateSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const sections = (raw as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) {
    return null;
  }
  const normalized: ExamTemplateSnapshotSection[] = sections
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map((attachment, index) => {
      const nested = attachment.library_section;
      const row = nested && typeof nested === "object" ? nested as Record<string, unknown> : attachment;
      const defaults = publishedFields(row.response_fields ?? row.default_response_fields);
      return {
        source_uuid: String(row.library_section_uuid ?? row.uuid ?? attachment.uuid ?? ""),
        code: String(row.code || row.uuid || `section_${index + 1}`),
        name: String(row.name || "Section"),
        content_mode: String(row.content_mode ?? "items"),
        is_mandatory: Boolean(row.is_mandatory),
        selection_mode: String(row.selection_mode ?? "inclusive"),
        sort_order: Number(attachment.sort_order ?? row.sort_order ?? index),
        response_fields: defaults as OhResponseField[],
        response_definitions_missing: row.response_fields == null && row.default_response_fields == null,
        items: (Array.isArray(row.items) ? row.items : []).filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").map((item: Record<string, unknown>, itemIndex: number) => {
          const names = item.names_i18n as Record<string, string> | undefined;
          return {
            uuid: typeof item.uuid === "string" ? item.uuid : undefined,
            code: String(item.code || item.uuid || `item_${itemIndex + 1}`),
            name: String(item.name || names?.en || Object.values(names ?? {})[0] || item.code || "Item"),
            sort_order: Number(item.sort_order ?? itemIndex),
            inherits: item.override_response_fields == null,
            response_definitions_missing: item.response_fields == null && item.effective_response_fields == null && item.override_response_fields == null && row.response_fields == null && row.default_response_fields == null,
            response_fields: publishedFields(item.response_fields ?? item.effective_response_fields ?? item.override_response_fields ?? defaults),
          };
        }).sort((a, b) => a.sort_order - b.sort_order),
      };
    })
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return {
    schema_version: Number((raw as { schema_version?: number }).schema_version ?? 2),
    sections: normalized,
  };
}

export function emptyExamTemplateAnswers(): ExamTemplateAnswers {
  return { picks: {}, fields: {} };
}

export function fieldOwnerKey(sectionCode: string, itemCode?: string) {
  return itemCode ? `${sectionCode}:${itemCode}` : sectionCode;
}

export function hasCompleteExamDefinitions(raw: unknown): boolean {
  const snapshot = parseExamTemplateSnapshot(raw);
  return Boolean(snapshot?.sections.length && snapshot.sections.every((section) => section.content_mode === "direct" ? !section.response_definitions_missing : section.items.every((item) => !item.response_definitions_missing)));
}

export function remapUnansweredExamPicks(from: ExamTemplateSnapshot, to: ExamTemplateSnapshot, answers: ExamTemplateAnswers): ExamTemplateAnswers {
  if (Object.values(answers.fields).some((fields) => Object.values(fields).some((value) => typeof value !== "string" || value.trim() !== ""))) throw new Error("Entered responses must keep their original version.");
  const next = emptyExamTemplateAnswers();
  for (const [code, picks] of Object.entries(answers.picks)) {
    if (!picks.length) continue;
    const source = from.sections.find((section) => section.code === code);
    const target = to.sections.find((section) => source?.source_uuid && section.source_uuid === source.source_uuid);
    if (!source || !target) throw new Error("The updated form cannot safely keep these selections.");
    next.picks[target.code] = picks.map((pick) => {
      const item = source.items.find((row) => row.code === pick);
      const replacement = target.items.find((row) => item?.uuid && row.uuid === item.uuid);
      if (!replacement) throw new Error("The updated form cannot safely keep these selections.");
      return replacement.code;
    });
  }
  return next;
}
