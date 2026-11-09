"use client";

import { TemplateGallery } from "@/features/oh-template-builder/components/TemplateGallery";

type OhEmployeeFormTemplatesSettingsTabProps = {
  isActive: boolean;
};

export function OhEmployeeFormTemplatesSettingsTab({ isActive }: OhEmployeeFormTemplatesSettingsTabProps) {
  if (!isActive) {
    return null;
  }
  return <TemplateGallery kind="employee" />;
}
