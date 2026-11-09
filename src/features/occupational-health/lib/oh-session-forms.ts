export type SessionAttachedForm = {
  uuid: string;
  name: string;
  system_type?: string | null;
};

export type SessionVisitType = {
  code: string;
  forms?: SessionAttachedForm[];
} | null;

export type SessionFormStep =
  | { kind: "employee"; title: "Employee form" }
  | { kind: "examination"; title: "Examination" }
  | { kind: "certificate"; title: "Certificate of fitness" }
  | { kind: "attached"; uuid: string; title: string };

const BUILTIN_SYSTEM_TYPES = new Set(["employee_form", "examination", "certificate"]);

/** Forms for one occupational visit, in the order they are completed. */
export function sessionFormSteps(visitType: SessionVisitType): SessionFormStep[] {
  const steps: SessionFormStep[] = [];
  if (visitType?.code === "pre_employment") {
    steps.push({ kind: "employee", title: "Employee form" });
  }
  steps.push({ kind: "examination", title: "Examination" });
  steps.push({ kind: "certificate", title: "Certificate of fitness" });
  const seen = new Set<string>();
  for (const form of visitType?.forms ?? []) {
    if (form.system_type && BUILTIN_SYSTEM_TYPES.has(form.system_type)) {
      continue;
    }
    if (seen.has(form.uuid)) {
      continue;
    }
    seen.add(form.uuid);
    steps.push({ kind: "attached", uuid: form.uuid, title: form.name });
  }
  return steps;
}

export function sessionFormStepKey(step: SessionFormStep): string {
  return step.kind === "attached" ? step.uuid : step.kind;
}
