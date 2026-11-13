import type { CofTemplateAiField, CofTemplateAiOperation } from "@/features/oh-template-builder/lib/templateAi";

export type DedicatedRecordId =
  | "immunizations"
  | "drug_alcohol"
  | "health_checks"
  | "fitness"
  | "employment";

export type DedicatedRecordMatch = {
  id: DedicatedRecordId;
  label: string;
  href: string;
  reason: string;
  suggestion: string;
};

export type FormReviewFinding = {
  id: string;
  target: "section" | "item" | "field";
  status: "issue";
  kind: "dedicated_page" | "quality";
  recordType: DedicatedRecordId | null;
  label: string;
  reason: string;
  suggestion: string;
  href: string;
  pageLabel: string;
  ownerTarget?: string | null;
  ownerId?: string | null;
};

export type FormReviewSnapshot = {
  name?: string;
  code?: string;
  sections: Array<{
    id: string;
    name: string;
    code?: string;
    fields?: Array<{ id?: string; label?: string; name?: string; code?: string }>;
    items?: Array<{
      id: string;
      name: string;
      code?: string;
      fields?: Array<{ id?: string; label?: string; name?: string; code?: string }>;
    }>;
  }>;
};

type RecordDefinition = DedicatedRecordMatch & {
  exact: string[];
  phrases: string[];
  codes: string[];
  exclude: string[];
};

const RECORDS: Record<DedicatedRecordId, RecordDefinition> = {
  immunizations: {
    id: "immunizations",
    label: "Immunizations",
    href: "/occupational-health/immunizations",
    reason: "Immunizations are recorded on the Immunizations page; this field duplicates it.",
    suggestion: "Remove this field and record doses on the Immunizations page.",
    exact: [
      "immunization",
      "immunisation",
      "immunizations",
      "immunisations",
      "vaccination",
      "vaccinations",
      "vaccine",
      "vaccines",
      "vaccine record",
      "immunization record",
      "immunisation record",
    ],
    phrases: ["immunization", "immunisation", "vaccination", "vaccine", "inoculation"],
    codes: ["IMMUNIZ", "IMMUNIS", "VACCIN", "INOCULAT"],
    exclude: ["immunocompromised", "immune deficiency", "autoimmune", "immunity status as history"],
  },
  drug_alcohol: {
    id: "drug_alcohol",
    label: "Drug & alcohol",
    href: "/occupational-health/drug-alcohol",
    reason: "Drug & alcohol tests are recorded on the Drug & alcohol page; this field duplicates it.",
    suggestion: "Remove this field and record tests on the Drug & alcohol page.",
    exact: ["drug and alcohol", "drugs and alcohol", "drug alcohol", "d and a", "drug and alcohol testing"],
    phrases: [
      "drug and alcohol",
      "drugs and alcohol",
      "d and a",
      "drug test",
      "drug screen",
      "drug screening",
      "urine drug",
      "alcohol test",
      "alcohol screen",
      "breath alcohol",
      "breathalyzer",
      "breathalyser",
      "breathalyz",
      "toxicology screen",
      "toxicology test",
      "chain of custody",
      "mro review",
      "substance abuse test",
      "substance misuse test",
      "random drug",
      "random alcohol",
    ],
    codes: [
      "DRUG_ALCOHOL",
      "DRUG_TEST",
      "DRUG_SCREEN",
      "ALCOHOL_TEST",
      "ALCOHOL_SCREEN",
      "BREATH_ALCOHOL",
      "TOXICOLOGY",
      "CHAIN_OF_CUSTODY",
    ],
    exclude: [
      "prescription drug",
      "alcohol intake",
      "alcohol use",
      "alcohol consumption",
      "drinks alcohol",
      "substance use history",
      "recreational drug history",
    ],
  },
  health_checks: {
    id: "health_checks",
    label: "Health checks",
    href: "/health-programs",
    reason: "Health checks are recorded on the Health checks page; this field duplicates it.",
    suggestion: "Remove this field and record results on the Health checks page.",
    exact: [
      "health check",
      "health checks",
      "health programme",
      "health program",
      "health programs",
      "health programmes",
    ],
    phrases: ["health check", "periodic health screen", "health programme", "health program"],
    codes: ["HEALTH_CHECK", "HEALTH_PROGRAM"],
    exclude: [],
  },
  fitness: {
    id: "fitness",
    label: "Fitness",
    href: "/fitness",
    reason: "Fitness for duty is recorded on the Fitness page; this field duplicates it.",
    suggestion: "Remove this field and record fitness for duty on the Fitness page.",
    exact: [
      "fitness for duty",
      "fitness board",
      "fitness training",
      "fitness record",
      "fitness programme",
      "fitness program",
    ],
    phrases: [
      "fitness for duty",
      "fitness board",
      "fitness training",
      "fitness record",
      "fitness programme",
      "fitness program",
    ],
    codes: [
      "FITNESS_FOR_DUTY",
      "FITNESS_BOARD",
      "FITNESS_TRAINING",
      "FITNESS_RECORD",
      "FITNESS_PROGRAMME",
      "FITNESS_PROGRAM",
    ],
    exclude: [
      "certificate of fitness",
      "fitness certificate",
      "fitness outcome",
      "fit for work",
      "fitness result",
      "fitness restriction",
    ],
  },
  employment: {
    id: "employment",
    label: "Employment",
    href: "/occupational-health/employment",
    reason: "Employment is recorded on the Employment page; this field duplicates it.",
    suggestion: "Remove this field and record employment on the Employment page.",
    exact: [
      "employment",
      "employment history",
      "employment record",
      "employment records",
      "employment episode",
      "employment episodes",
      "employer assignment",
    ],
    phrases: [
      "employment history",
      "employment record",
      "employment episode",
      "employer assignment",
      "employment start date",
    ],
    codes: [
      "EMPLOYMENT_HISTORY",
      "EMPLOYMENT_RECORD",
      "EMPLOYMENT_EPISODE",
      "EMPLOYER_ASSIGNMENT",
      "EMPLOYMENT",
    ],
    exclude: ["pre employment", "preemployment"],
  },
};

export function normalizeDedicatedText(value: string | null | undefined): string {
  const lowered = (value ?? "")
    .toLowerCase()
    .replaceAll("&", " and ")
    .replaceAll("/", " ")
    .replaceAll("+", " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return lowered;
}

export function normalizeDedicatedCode(value: string | null | undefined): string {
  return (value ?? "")
    .toUpperCase()
    .trim()
    .replaceAll("&", "_AND_")
    .replaceAll("/", "_")
    .replaceAll("+", "_")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function codeMatches(haystack: string, pattern: string): boolean {
  const needle = normalizeDedicatedCode(pattern);
  const value = normalizeDedicatedCode(haystack);
  if (!needle || !value) return false;
  if (value === needle) return true;
  return value.startsWith(`${needle}_`) || value.includes(`_${needle}_`) || value.endsWith(`_${needle}`);
}

function matchesRecord(record: RecordDefinition, texts: string[]): boolean {
  const haystack = normalizeDedicatedText(texts.join(" "));
  const codeHaystack = normalizeDedicatedCode(texts.join(" "));
  if (!haystack && !codeHaystack) return false;
  for (const exclude of record.exclude) {
    const excluded = normalizeDedicatedText(exclude);
    if (
      excluded &&
      (haystack.includes(excluded) ||
        normalizeDedicatedCode(haystack).includes(normalizeDedicatedCode(exclude)))
    ) {
      return false;
    }
  }
  for (const text of texts) {
    const normalized = normalizeDedicatedText(text);
    if (normalized && record.exact.includes(normalized)) return true;
  }
  for (const phrase of record.phrases) {
    const needle = normalizeDedicatedText(phrase);
    if (needle && haystack.includes(needle)) return true;
  }
  for (const code of record.codes) {
    if (codeMatches(codeHaystack, code)) return true;
    if (texts.some((text) => codeMatches(text, code))) return true;
  }
  return false;
}

export function matchDedicatedOhRecord(...texts: Array<string | null | undefined>): DedicatedRecordMatch | null {
  const values = texts.map((text) => text ?? "");
  for (const record of Object.values(RECORDS)) {
    if (matchesRecord(record, values)) {
      return {
        id: record.id,
        label: record.label,
        href: record.href,
        reason: record.reason,
        suggestion: record.suggestion,
      };
    }
  }
  return null;
}

export function findingFromMatch(
  target: FormReviewFinding["target"],
  id: string,
  label: string,
  match: DedicatedRecordMatch,
  owner?: { target?: string | null; id?: string | null },
): FormReviewFinding {
  return {
    id,
    target,
    status: "issue",
    kind: "dedicated_page",
    recordType: match.id,
    label,
    reason: match.reason,
    suggestion: match.suggestion,
    href: match.href,
    pageLabel: match.label,
    ownerTarget: owner?.target,
    ownerId: owner?.id,
  };
}

type AttachResolver = (operation: CofTemplateAiOperation) => { name?: string; code?: string };

export function matchAiOperation(
  operation: CofTemplateAiOperation,
  resolveAttach?: AttachResolver,
): DedicatedRecordMatch | null {
  const texts = [operation.name ?? "", operation.code ?? "", operation.section_code ?? ""];
  if (operation.type === "attach_section" && resolveAttach) {
    const resolved = resolveAttach(operation);
    texts.push(resolved.name ?? "", resolved.code ?? "");
  }
  return matchDedicatedOhRecord(...texts);
}

export type DroppedAiOperation = {
  type: string;
  name: string;
  code: string;
  scope: "operation" | "field";
  record: string;
  label: string;
  href: string;
  reason: string;
  suggestion: string;
};

function droppedEntry(
  operation: { type?: string; name?: string; label?: string; code?: string },
  match: DedicatedRecordMatch | { id: string; label: string; href: string; reason: string; suggestion: string },
  scope: "operation" | "field",
): DroppedAiOperation {
  return {
    type: operation.type ?? scope,
    name: operation.name ?? operation.label ?? "",
    code: operation.code ?? "",
    scope,
    record: match.id,
    label: match.label,
    href: match.href,
    reason: match.reason,
    suggestion: match.suggestion,
  };
}

export function filterAiOperations(
  operations: CofTemplateAiOperation[],
  resolveAttach?: AttachResolver,
): { operations: CofTemplateAiOperation[]; dropped: DroppedAiOperation[] } {
  const kept: CofTemplateAiOperation[] = [];
  const dropped: DroppedAiOperation[] = [];
  const droppedSectionCodes = new Map<string, DedicatedRecordMatch>();

  for (const operation of operations) {
    const type = operation.type ?? "";
    const code = normalizeDedicatedCode(operation.code ?? "");
    const sectionCode = normalizeDedicatedCode(operation.section_code ?? "");
    let match = matchAiOperation(operation, resolveAttach);
    if (!match && type === "create_item" && sectionCode && droppedSectionCodes.has(sectionCode)) {
      match = droppedSectionCodes.get(sectionCode) ?? null;
    }
    if (match) {
      dropped.push(droppedEntry(operation, match, "operation"));
      if (type === "create_section" && code) droppedSectionCodes.set(code, match);
      continue;
    }
    if (operation.fields?.length) {
      const keptFields: CofTemplateAiField[] = [];
      for (const field of operation.fields) {
        const fieldMatch = matchDedicatedOhRecord(field.label ?? "", field.code ?? "");
        if (fieldMatch) {
          dropped.push(droppedEntry({ ...field, type: "field" }, fieldMatch, "field"));
          continue;
        }
        keptFields.push(field);
      }
      const next = { ...operation, fields: keptFields };
      if (keptFields.length === 0 && (type === "create_section" || type === "create_item")) {
        dropped.push(
          droppedEntry(operation, {
            id: "reserved_fields",
            label: "Dedicated records",
            href: "",
            reason: "Every field on this item belongs on a dedicated record page.",
            suggestion: "Remove it and record the data on the dedicated page.",
          }, "operation"),
        );
        continue;
      }
      kept.push(next);
      continue;
    }
    kept.push(operation);
  }
  return { operations: kept, dropped };
}

export function droppedAiMessage(dropped: DroppedAiOperation[]): string {
  if (dropped.length === 0) return "";
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const entry of dropped) {
    if (!entry.record || seen.has(entry.record)) continue;
    seen.add(entry.record);
    const page = entry.href ? `${entry.label} page (${entry.href})` : `${entry.label} page`;
    parts.push(`${entry.label} was left out — those records belong on the ${page}.`);
  }
  return parts.join(" ");
}

export function droppedAiErrors(dropped: DroppedAiOperation[]): string[] {
  return dropped.map((entry) => {
    const name = entry.name || entry.code || "Item";
    return `${name}: ${entry.reason}${entry.suggestion ? ` ${entry.suggestion}` : ""}${entry.href ? ` ${entry.href}` : ""}`.trim();
  });
}

function reviewFields(
  fields: Array<{ id?: string; label?: string; name?: string; code?: string }> | undefined,
  ownerId: string,
  ownerTarget: "section" | "item",
): FormReviewFinding[] {
  if (!fields) return [];
  const findings: FormReviewFinding[] = [];
  fields.forEach((field, index) => {
    const label = field.label ?? field.name ?? "";
    const code = field.code ?? "";
    const match = matchDedicatedOhRecord(label, code);
    if (!match) return;
    const id = field.id ?? (ownerId ? `${ownerId}:${code || index}` : `${code || index}`);
    findings.push(findingFromMatch("field", id, label || code, match, { target: ownerTarget, id: ownerId }));
  });
  return findings;
}

export function reviewFormSnapshot(snapshot: FormReviewSnapshot): FormReviewFinding[] {
  const findings: FormReviewFinding[] = [];
  for (const section of snapshot.sections ?? []) {
    const sectionMatch = matchDedicatedOhRecord(section.name, section.code ?? "");
    if (sectionMatch) {
      findings.push(findingFromMatch("section", section.id, section.name || section.code || "", sectionMatch));
    }
    findings.push(...reviewFields(section.fields, section.id, "section"));
    for (const item of section.items ?? []) {
      const itemMatch = matchDedicatedOhRecord(item.name, item.code ?? "");
      if (itemMatch) {
        findings.push(findingFromMatch("item", item.id, item.name || item.code || "", itemMatch));
      }
      findings.push(...reviewFields(item.fields, item.id, "item"));
    }
  }
  return findings;
}

export function mergeReviewFindings(
  dedicated: FormReviewFinding[],
  quality: FormReviewFinding[],
): FormReviewFinding[] {
  const claimed = new Set(dedicated.map(findingKey));
  const merged = [...dedicated];
  for (const finding of quality) {
    const key = findingKey(finding);
    if (claimed.has(key)) continue;
    claimed.add(key);
    merged.push(finding);
  }
  return merged;
}

function findingKey(finding: FormReviewFinding): string {
  return `${finding.target}:${finding.id}:${finding.label}:${finding.recordType ?? finding.kind}`;
}

export function normalizeQualityFinding(raw: {
  id?: string;
  target?: string;
  code?: string;
  label?: string;
  name?: string;
  reason?: string;
  suggestion?: string;
  href?: string;
  page_label?: string;
  pageLabel?: string;
  owner_target?: string | null;
  owner_id?: string | null;
  ownerTarget?: string | null;
  ownerId?: string | null;
}): FormReviewFinding | null {
  const reason = (raw.reason ?? "").trim();
  const label = (raw.label ?? raw.name ?? "").trim();
  if (!reason) return null;
  const target = raw.target === "section" || raw.target === "item" || raw.target === "field" ? raw.target : "field";
  return {
    id: raw.id ?? raw.code ?? label,
    target,
    status: "issue",
    kind: "quality",
    recordType: null,
    label,
    reason,
    suggestion: (raw.suggestion ?? "").trim(),
    href: raw.href ?? "",
    pageLabel: raw.pageLabel ?? raw.page_label ?? "",
    ownerTarget: raw.ownerTarget ?? raw.owner_target ?? null,
    ownerId: raw.ownerId ?? raw.owner_id ?? null,
  };
}
