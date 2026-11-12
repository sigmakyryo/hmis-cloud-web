import { Award, ClipboardList, IdCard, type LucideIcon } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import {
  TEMPLATE_KINDS,
  type TemplateKind,
} from "@/features/oh-template-builder/template-builder.types";

type TemplateKindMeta = {
  /** Singular noun, e.g. "Exam template". */
  label: string;
  pluralLabel: string;
  description: string;
  namePlaceholder: string;
  codePlaceholder: string;
  /** Settings tab id on the occupational health module page. */
  settingsTab: "employee-forms" | "exam-templates" | "catalog";
};

export const TEMPLATE_KIND_META: Record<TemplateKind, TemplateKindMeta> = {
  employee: {
    label: "Employee form template",
    pluralLabel: "Employee form templates",
    description: "Forms collected at the start of an occupational health visit.",
    namePlaceholder: "New employee details",
    codePlaceholder: "EMPLOYEE_DETAILS",
    settingsTab: "employee-forms",
  },
  exam: {
    label: "Exam template",
    pluralLabel: "Exam templates",
    description:
      "Layouts clinicians fill in during an occupational health examination.",
    namePlaceholder: "Pre-employment medical",
    codePlaceholder: "PRE_EMPLOYMENT",
    settingsTab: "exam-templates",
  },
  certificate: {
    label: "COF template",
    pluralLabel: "COF templates",
    description:
      "Certificate of Fitness layouts issued at the end of an examination.",
    namePlaceholder: "Underground worker COF",
    codePlaceholder: "UNDERGROUND_COF",
    settingsTab: "catalog",
  },
};

export const TEMPLATE_KIND_ICONS: Record<TemplateKind, LucideIcon> = {
  employee: IdCard,
  exam: ClipboardList,
  certificate: Award,
};

export function isTemplateKind(value: string): value is TemplateKind {
  return (TEMPLATE_KINDS as readonly string[]).includes(value);
}

/** Back-target for the template builder. Forms opened from OHS Forms return there. */
export function templateGalleryHref(_kind: TemplateKind) {
  return ROUTES.occupationalHealthForms;
}

export const templateQueryKeys = {
  list: (kind: TemplateKind) => ["oh-templates", kind, "list"] as const,
  detail: (kind: TemplateKind, uuid: string) =>
    ["oh-templates", kind, "detail", uuid] as const,
  attachments: (kind: TemplateKind, uuid: string) =>
    ["oh-templates", kind, "attachments", uuid] as const,
  library: (kind: TemplateKind) => ["oh-templates", kind, "library"] as const,
  items: (kind: TemplateKind, sectionUuid: string) =>
    ["oh-templates", kind, "items", sectionUuid] as const,
};
