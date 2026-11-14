"use client";

import { SectionAudienceToggle } from "@/features/oh-template-builder/components/SectionAudienceToggle";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, Layers, Unlink } from "lucide-react";
import { useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { Switch } from "@/components/ui/switch";
import { ConfirmActionButton } from "@/features/oh-template-builder/components/ConfirmActionButton";
import {
  InspectorShell,
  InspectorToggleRow,
} from "@/features/oh-template-builder/components/InspectorShell";
import {
  SelectionModeToggle,
  interactionFromSection,
  sectionModesFromInteraction,
} from "@/features/oh-template-builder/components/SelectionModeToggle";
import { FormFieldReviewFlag } from "@/features/oh-template-builder/components/FormFieldReviewFlag";
import { ResponseFieldsList } from "@/features/oh-template-builder/components/ResponseFieldsList";
import { findingFromMatch, matchDedicatedOhRecord } from "@/features/oh-template-builder/lib/dedicatedOhRecordPages";
import { useFormReview } from "@/features/oh-template-builder/hooks/useTemplateFormReview";
import { useInspectorAutosave } from "@/features/oh-template-builder/hooks/useInspectorAutosave";
import { useTemplateBuilder } from "@/features/oh-template-builder/hooks/useTemplateBuilder";
import {
  defaultResponseFields,
  normalizeResponseFields,
} from "@/features/settings/components/modules/occupational-health/template-library/responseConfig";
import {
  sectionFormSchema,
  type SectionFormValues,
} from "@/features/oh-template-builder/template-builder.schema";
import type {
  BuilderAttachment,
  BuilderSection,
} from "@/features/oh-template-builder/template-builder.types";

type SectionInspectorProps = {
  attachment: BuilderAttachment;
  section: BuilderSection;
};

export function SectionInspector({ attachment, section }: SectionInspectorProps) {
  const { updateSection, detachSection, archiveSection, isPending } =
    useTemplateBuilder();
  const review = useFormReview();
  const form = useForm<SectionFormValues>({
    resolver: zodResolver(sectionFormSchema),
    values: {
      name: section.name,
      isMandatory: section.isMandatory,
      appliesToSex: section.appliesToSex ?? null,
      selectionMode: section.selectionMode,
      contentMode: section.contentMode,
      defaultResponseFields: normalizeResponseFields(section.defaultResponseFields),
    },
  });
  const [contentMode, selectionMode, sectionName] = useWatch({
    control: form.control,
    name: ["contentMode", "selectionMode", "name"],
  });
  const dedicated = matchDedicatedOhRecord(sectionName ?? section.name, section.code);
  const sectionFinding = dedicated
    ? findingFromMatch("section", attachment.uuid, sectionName || section.name, dedicated)
    : review.findingFor("section", attachment.uuid);
  const isSaving = isPending(`section:update:${section.uuid}`);
  const isRemoving =
    isPending(`section:detach:${attachment.uuid}`) ||
    isPending(`section:archive:${section.uuid}`);

  const onSubmit = useCallback(
    async (values: SectionFormValues) => updateSection(section.uuid, values),
    [section.uuid, updateSection],
  );
  useInspectorAutosave(form, onSubmit);

  return (
    <Form {...form}>
      <form
        className="h-full"
        onSubmit={form.handleSubmit((values) => void onSubmit(values))}
      >
        <InspectorShell
          eyebrow={
            <span className="inline-flex items-center gap-1.5">
              <Layers className="size-3.5" aria-hidden />
              Section
            </span>
          }
          title={section.name}
          tabs={[
            {
              id: "content",
              label: "Content",
              content: (
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Name <RequiredFieldMarker />
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                        {sectionFinding ? (
                          <FormFieldReviewFlag
                            finding={sectionFinding}
                            onRemove={
                              section.isSystem
                                ? undefined
                                : () => {
                                    void archiveSection(attachment);
                                  }
                            }
                          />
                        ) : null}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultResponseFields"
                    render={({ field }) => (
                      <FormItem>
                        <ResponseFieldsList
                          title={contentMode === "direct" ? "Section fields" : "Default fields"}
                          value={field.value}
                          onChange={field.onChange}
                          emptyHint={
                            contentMode === "direct"
                              ? "Each field is a value staff type in, such as blood pressure or a note."
                              : "A follow-up after an item is picked. Leave this empty for a plain choice."
                          }
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ),
            },
            {
              id: "settings",
              label: "Settings",
              content: (
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="appliesToSex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Who sees this section</FormLabel>
                        <FormControl>
                          <SectionAudienceToggle value={field.value ?? null} onChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contentMode"
                    render={() => (
                      <FormItem>
                        <FormLabel>How staff answer</FormLabel>
                        <SelectionModeToggle
                          value={interactionFromSection({ contentMode, selectionMode })}
                          onChange={(mode) => {
                            const next = sectionModesFromInteraction(mode);
                            form.setValue("contentMode", next.contentMode, { shouldDirty: true });
                            form.setValue("selectionMode", next.selectionMode, {
                              shouldDirty: true,
                            });
                            if (
                              mode === "direct" &&
                              form.getValues("defaultResponseFields").length < 1
                            ) {
                              form.setValue(
                                "defaultResponseFields",
                                defaultResponseFields("text"),
                                { shouldDirty: true },
                              );
                            }
                          }}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isMandatory"
                    render={({ field }) => (
                      <InspectorToggleRow
                        title="Required section"
                        description="Must be completed before the form can be submitted."
                        control={
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-label="Required section"
                          />
                        }
                      />
                    )}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="oh-section-code">Code</Label>
                    <Input
                      id="oh-section-code"
                      value={section.code}
                      disabled
                      className="font-mono text-[13px]"
                    />
                    <p className="text-xs text-dash-muted">
                      Fixed once created. Programmes refer to sections by code.
                    </p>
                  </div>
                  <p className="text-xs leading-5 text-dash-muted">
                    {section.isSystem
                      ? "System section. It backs programme requirements, so it can be renamed but not archived."
                      : "Shared library section. Changes here apply to every template that uses it."}
                  </p>
                </div>
              ),
            },
          ]}
          footer={
            <>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isRemoving}
                  onClick={() => void detachSection(attachment)}
                  className="gap-1.5 text-brand-muted hover:text-brand-navy"
                >
                  <Unlink className="size-3.5" aria-hidden />
                  Remove
                </Button>
                {section.isSystem ? null : (
                  <ConfirmActionButton
                    confirmLabel="Delete section"
                    disabled={isRemoving}
                    onConfirm={() => archiveSection(attachment)}
                  >
                    <Archive className="size-3.5" aria-hidden />
                    Delete
                  </ConfirmActionButton>
                )}
              </div>
              <PrimaryButton
                type="submit"
                size="sm"
                disabled={isSaving || !form.formState.isDirty}
              >
                {isSaving ? "Saving" : "Save"}
              </PrimaryButton>
            </>
          }
        />
      </form>
    </Form>
  );
}
