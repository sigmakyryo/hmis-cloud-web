import { describe, expect, it } from "vitest";

import {
  droppedAiMessage,
  filterAiOperations,
  findingFromMatch,
  matchDedicatedOhRecord,
  mergeReviewFindings,
  normalizeQualityFinding,
  reviewFormSnapshot,
} from "@/features/oh-template-builder/lib/dedicatedOhRecordPages";
import { validateCertificateAiDraft } from "@/features/oh-template-builder/lib/templateAiStream";

describe("dedicatedOhRecordPages", () => {
  it("matches the five dedicated record types", () => {
    expect(matchDedicatedOhRecord("Immunizations")?.id).toBe("immunizations");
    expect(matchDedicatedOhRecord("Tetanus vaccination")?.id).toBe("immunizations");
    expect(matchDedicatedOhRecord("Hepatitis B vaccine", "HEP_B_VACCINE")?.id).toBe("immunizations");
    expect(matchDedicatedOhRecord("Drug & alcohol")?.id).toBe("drug_alcohol");
    expect(matchDedicatedOhRecord("Urine drug screen")?.id).toBe("drug_alcohol");
    expect(matchDedicatedOhRecord("Breath alcohol")?.id).toBe("drug_alcohol");
    expect(matchDedicatedOhRecord("Health checks")?.id).toBe("health_checks");
    expect(matchDedicatedOhRecord("Fitness for duty")?.id).toBe("fitness");
    expect(matchDedicatedOhRecord("Fitness board")?.id).toBe("fitness");
    expect(matchDedicatedOhRecord("Employment")?.id).toBe("employment");
    expect(matchDedicatedOhRecord("Employment history")?.id).toBe("employment");
  });

  it("does not flag clinical exam or COF wording", () => {
    expect(matchDedicatedOhRecord("Pre-employment medical")).toBeNull();
    expect(matchDedicatedOhRecord("PRE_EMPLOYMENT")).toBeNull();
    expect(matchDedicatedOhRecord("Lung function")).toBeNull();
    expect(matchDedicatedOhRecord("Spirometry", "SPIROMETRY")).toBeNull();
    expect(matchDedicatedOhRecord("Audiometry")).toBeNull();
    expect(matchDedicatedOhRecord("Fit for work")).toBeNull();
    expect(matchDedicatedOhRecord("Fitness outcome")).toBeNull();
    expect(matchDedicatedOhRecord("Certificate of Fitness")).toBeNull();
    expect(matchDedicatedOhRecord("Fitness")).toBeNull();
    expect(matchDedicatedOhRecord("FITNESS")).toBeNull();
    expect(matchDedicatedOhRecord("Job title")).toBeNull();
    expect(matchDedicatedOhRecord("Occupational history")).toBeNull();
    expect(matchDedicatedOhRecord("Alcohol use")).toBeNull();
    expect(matchDedicatedOhRecord("Immunocompromised")).toBeNull();
    expect(matchDedicatedOhRecord("Medications")).toBeNull();
  });

  it("drops reserved AI operations and reserved fields, keeping clinical work", () => {
    const filtered = filterAiOperations(
      [
        { type: "create_section", name: "Immunizations", code: "IMMUNIZATIONS", fields: [{ code: "DOSE", label: "Dose" }] },
        { type: "create_item", section_code: "IMMUNIZATIONS", name: "Tetanus vaccine", code: "TETANUS", fields: [{ code: "DATE", label: "Date" }] },
        {
          type: "create_section",
          name: "Respiratory",
          code: "RESPIRATORY",
          fields: [
            { code: "SPIROMETRY", label: "Spirometry" },
            { code: "TETANUS_VACCINE", label: "Tetanus vaccine" },
          ],
        },
        { type: "create_item", section_code: "RESPIRATORY", name: "Lung function", code: "LUNG_FUNCTION", fields: [{ code: "RESULT", label: "Result" }] },
        { type: "create_section", name: "Pre-employment history", code: "PRE_EMPLOYMENT", fields: [{ code: "JOB", label: "Job title" }] },
      ],
    );
    expect(filtered.operations.map((operation) => operation.code)).toEqual([
      "RESPIRATORY",
      "LUNG_FUNCTION",
      "PRE_EMPLOYMENT",
    ]);
    expect(filtered.operations[0]?.fields).toEqual([{ code: "SPIROMETRY", label: "Spirometry" }]);
    expect(droppedAiMessage(filtered.dropped)).toContain("Immunizations");
  });

  it("reviews a snapshot and flags reserved sections only", () => {
    const findings = reviewFormSnapshot({
      sections: [
        {
          id: "s-imm",
          name: "Immunizations",
          code: "IMMUNIZATIONS",
          items: [{ id: "i-tet", name: "Tetanus vaccine", code: "TETANUS" }],
        },
        {
          id: "s-resp",
          name: "Respiratory",
          code: "RESPIRATORY",
          fields: [{ id: "f-spiro", label: "Spirometry", code: "SPIROMETRY" }],
        },
        { id: "s-emp", name: "Employment history", code: "EMPLOYMENT_HISTORY" },
      ],
    });
    const ids = findings.map((finding) => finding.id);
    expect(ids).toEqual(expect.arrayContaining(["s-imm", "i-tet", "s-emp"]));
    expect(ids).not.toContain("f-spiro");
    expect(findings[0]?.href).toBe("/occupational-health/immunizations");
    expect(findings[0]?.suggestion).toBeTruthy();
  });

  it("filters reserved operations out of a streamed AI draft and explains why", () => {
    const draft = validateCertificateAiDraft(
      JSON.stringify({
        assistant_message: "Proposed a mixed draft",
        operations: [
          { type: "create_section", name: "Immunizations", code: "IMMUNIZATIONS", fields: [{ code: "DOSE", label: "Dose" }] },
          { type: "create_item", name: "Lung function", code: "LUNG_FUNCTION", fields: [{ code: "RESULT", label: "Result" }] },
        ],
      }),
    );
    expect(draft.operations).toEqual([
      { type: "create_item", name: "Lung function", code: "LUNG_FUNCTION", fields: [{ code: "RESULT", label: "Result" }] },
    ]);
    expect(draft.assistant_message).toContain("Immunizations");
    expect(draft.assistant_message).toContain("/occupational-health/immunizations");
  });

  it("keeps one finding when dedicated and quality flags target the same field", () => {
    const match = matchDedicatedOhRecord("Employment History");
    expect(match).not.toBeNull();
    const dedicated = [findingFromMatch("field", "f-emp", "Employment History", match!)];
    const quality = [
      normalizeQualityFinding({
        id: "f-emp",
        target: "field",
        label: "Employment History",
        reason: "Employment is already captured on a dedicated page.",
        suggestion: "Remove this field.",
      })!,
    ];
    const merged = mergeReviewFindings(dedicated, quality);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.kind).toBe("dedicated_page");
    expect(merged[0]?.reason).toContain("Employment is recorded on the Employment page");
    expect(mergeReviewFindings(dedicated, dedicated)).toHaveLength(1);
  });
});
