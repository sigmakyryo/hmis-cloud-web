"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { reviewTemplateForm, type TemplateFormReviewResponse } from "@/features/oh-template-builder/lib/templateAi";
import {
  mergeReviewFindings,
  normalizeQualityFinding,
  reviewFormSnapshot,
  type FormReviewFinding,
  type FormReviewSnapshot,
} from "@/features/oh-template-builder/lib/dedicatedOhRecordPages";
import { useTemplateBuilder } from "@/features/oh-template-builder/hooks/useTemplateBuilder";
import { templateQueryKeys } from "@/features/oh-template-builder/lib/templateKinds";
import type { BuilderAttachment, BuilderItem, TemplateKind } from "@/features/oh-template-builder/template-builder.types";

type ItemsData = { items: BuilderItem[]; total: number };

type ReviewValue = {
  findings: FormReviewFinding[];
  dedicated: FormReviewFinding[];
  reviewing: boolean;
  findingFor: (target: FormReviewFinding["target"], id: string) => FormReviewFinding | undefined;
};

const ReviewContext = createContext<ReviewValue | null>(null);

function snapshotFromAttachments(
  kind: TemplateKind,
  attachments: BuilderAttachment[],
  queryClient: ReturnType<typeof useQueryClient>,
): FormReviewSnapshot {
  return {
    sections: attachments.map((attachment) => {
      const section = attachment.section;
      const itemsData = queryClient.getQueryData<ItemsData>(
        templateQueryKeys.items(kind, attachment.sectionUuid),
      );
      return {
        id: attachment.uuid,
        name: section?.name ?? "",
        code: section?.code ?? "",
        fields: (section?.defaultResponseFields ?? []).map((field) => ({
          id: `${attachment.uuid}:${field.code}`,
          label: field.label,
          code: field.code,
        })),
        items: (itemsData?.items ?? []).map((item) => ({
          id: item.uuid,
          name: item.name,
          code: item.code,
          fields: (item.effectiveResponseFields ?? item.overrideResponseFields ?? []).map((field) => ({
            id: `${item.uuid}:${field.code}`,
            label: field.label,
            code: field.code,
          })),
        })),
      };
    }),
  };
}

function useTemplateFormReviewState(): ReviewValue {
  const { kind = "certificate", templateUuid, attachments } = useTemplateBuilder();
  const queryClient = useQueryClient();
  const snapshot = useMemo(
    () => snapshotFromAttachments(kind, attachments, queryClient),
    [kind, attachments, queryClient, attachments.map((row) => row.uuid).join(",")],
  );
  // Recompute dedicated findings whenever cached items change: read cache during render.
  const dedicated = useMemo(() => reviewFormSnapshot(snapshot), [snapshot]);
  const [quality, setQuality] = useState<FormReviewFinding[]>([]);
  const [reviewing, setReviewing] = useState(false);

  const serialized = useMemo(() => JSON.stringify(snapshot), [snapshot]);

  useEffect(() => {
    if (!templateUuid) return;
    const parsed = JSON.parse(serialized) as FormReviewSnapshot;
    if (parsed.sections.length === 0) {
      setQuality([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setReviewing(true);
      void reviewTemplateForm(kind, templateUuid, parsed, true)
        .then((response: TemplateFormReviewResponse) => {
          if (controller.signal.aborted) return;
          const incoming = (response.findings ?? [])
            .filter((finding) => finding.kind === "quality")
            .map((finding) =>
              normalizeQualityFinding({
                id: finding.id,
                target: finding.target,
                label: finding.label,
                reason: finding.reason,
                suggestion: finding.suggestion,
                href: finding.href,
                pageLabel: finding.page_label ?? finding.pageLabel,
              }),
            )
            .filter((finding): finding is FormReviewFinding => finding !== null);
          setQuality(incoming);
        })
        .catch(() => {
          if (!controller.signal.aborted) setQuality([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setReviewing(false);
        });
    }, 900);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [kind, templateUuid, serialized]);

  const findings = useMemo(() => mergeReviewFindings(dedicated, quality), [dedicated, quality]);
  const byKey = useMemo(() => {
    const map = new Map<string, FormReviewFinding>();
    for (const finding of findings) {
      const key = `${finding.target}:${finding.id}`;
      if (!map.has(key)) map.set(key, finding);
    }
    return map;
  }, [findings]);

  return {
    findings,
    dedicated,
    reviewing,
    findingFor: (target, id) => byKey.get(`${target}:${id}`),
  };
}

export function TemplateFormReviewProvider({ children }: { children: ReactNode }) {
  const value = useTemplateFormReviewState();
  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useFormReview(): ReviewValue {
  return (
    useContext(ReviewContext) ?? {
      findings: [],
      dedicated: [],
      reviewing: false,
      findingFor: () => undefined,
    }
  );
}
