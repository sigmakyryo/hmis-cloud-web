"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { ROUTES } from "@/constants/routes";
import {
  fetchClinicalForms,
  fetchOhCofTemplates,
  fetchOhEmployeeFormTemplates,
  fetchOhExamTemplates,
} from "@/features/occupational-health/services/oh.service";

type DefinedForm = {
  uuid: string;
  name: string;
  kind: "employee" | "exam" | "certificate";
  detail: string;
};

const SECTIONS: Array<{ kind: DefinedForm["kind"]; title: string }> = [
  { kind: "employee", title: "Employee forms" },
  { kind: "exam", title: "Examinations" },
  { kind: "certificate", title: "Certificates of fitness" },
];

export function useDefinedOccupationalForms() {
  const clinical = useQuery({ queryKey: ["clinical-forms"], queryFn: () => fetchClinicalForms() });
  const employee = useQuery({
    queryKey: ["oh-employee-form-templates"],
    queryFn: () => fetchOhEmployeeFormTemplates(),
  });
  const exams = useQuery({
    queryKey: ["oh-exam-templates"],
    queryFn: () => fetchOhExamTemplates(),
  });
  const certificates = useQuery({
    queryKey: ["oh-cof-templates"],
    queryFn: () => fetchOhCofTemplates(),
  });
  const linked = new Set(
    (clinical.data ?? []).flatMap((form) => (form.template_uuid ? [form.template_uuid] : [])),
  );
  const forms = [
    ...toDefinedForms(employee.data, "employee", "Employee form"),
    ...toDefinedForms(exams.data, "exam", "Examination"),
    ...toDefinedForms(certificates.data, "certificate", "Certificate of fitness"),
  ].filter((form) => !linked.has(form.uuid));
  const sections = SECTIONS.map((section) => ({
    ...section,
    forms: forms.filter((form) => form.kind === section.kind),
  })).filter((section) => section.forms.length > 0);

  return { sections, isLoading: employee.isLoading || exams.isLoading || certificates.isLoading };
}

export function DefinedOccupationalForms() {
  const { sections } = useDefinedOccupationalForms();

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="defined-occupational-forms">
      {sections.map((section) => (
        <section key={section.kind}>
          <h2 className="mb-2 text-[13px] font-medium text-dash-muted">{section.title}</h2>
          <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
            {section.forms.map((form) => (
              <li key={`${form.kind}-${form.uuid}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium text-brand-navy">{form.name}</p>
                  <p className="text-[13px] text-dash-muted">{form.detail}</p>
                </div>
                <Link
                  className="text-[13px] font-medium text-brand-primary"
                  href={ROUTES.ohTemplateBuilder(form.kind, form.uuid)}
                >
                  Open builder
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function toDefinedForms(
  templates: Array<{ uuid: string; name: string; active?: boolean }> | undefined,
  kind: DefinedForm["kind"],
  detail: string,
): DefinedForm[] {
  return (templates ?? [])
    .filter((template) => template.active !== false)
    .map((template) => ({
      uuid: template.uuid,
      name: template.name,
      kind,
      detail,
    }));
}
