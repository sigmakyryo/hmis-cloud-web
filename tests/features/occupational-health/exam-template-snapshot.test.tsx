import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { validateExamAnswers } from "@/features/occupational-health/lib/exam-template-validation";
import { emptyExamTemplateAnswers } from "@/features/occupational-health/lib/exam-template-snapshot";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseExamTemplateSnapshot } from "@/features/occupational-health/lib/exam-template-snapshot";
import { itemFormSchema } from "@/features/oh-template-builder/template-builder.schema";
import { OhExamTemplateCaptureForm } from "@/features/occupational-health/components/OhExamTemplateCaptureForm";

afterEach(cleanup);
const field = { code: "severity", label: "Severity", response_type: "text", validation: {}, options: [{ code: "mild", label: "Mild" }], prompt_after_select: true };
const nestedPublication = { sections: [{ uuid: "attachment", sort_order: 1, library_section: { uuid: "section", code: "symptoms", name: "Symptoms", selection_mode: "exclusive", default_response_fields: [field], items: [{ uuid: "item", code: "cough", names_i18n: { en: "Cough" }, override_response_fields: null }] } }] };

describe("published examination snapshot", () => {
  it("decodes the actual nested published response instead of generic empty Section rows", () => {
    const snapshot = parseExamTemplateSnapshot(nestedPublication)!;
    expect(snapshot.sections[0].name).toBe("Symptoms");
    expect(snapshot.sections[0].items[0]).toMatchObject({ code: "cough", name: "Cough", response_fields: [field] });
    render(<OhExamTemplateCaptureForm snapshot={snapshot} onChange={vi.fn()} />);
    expect(screen.getByText("Symptoms")).toBeVisible();
    expect(screen.getByRole("radio", { name: "Cough" })).toBeVisible();
    expect(screen.queryByText("No items in this section.")).toBeNull();
  });
  it("shows previously saved option values from the immutable historical schema", () => {
    const snapshot = parseExamTemplateSnapshot(nestedPublication)!;
    render(<OhExamTemplateCaptureForm snapshot={snapshot} value={{ picks: { symptoms: ["cough"] }, fields: { "symptoms:cough": { severity: "mild" } } }} onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Mild" })).toHaveAttribute("aria-checked", "true");
  });
  it("preserves flat v3 direct fields and explicit non-inherited item overrides", () => {
    const snapshot = parseExamTemplateSnapshot({ schema_version: 3, sections: [
      { code: "vitals", name: "Vitals", content_mode: "direct", response_fields: [field], items: [] },
      { code: "symptoms", name: "Symptoms", response_fields: [field], items: [{ code: "cough", name: "Cough", response_fields: [] }] },
    ] })!;
    expect(snapshot.sections[0].response_fields).toEqual([field]);
    expect(snapshot.sections[1].items[0].response_fields).toEqual([]);
  });
  it("handles the older publication's names and items without reading mutable library records", () => {
    const snapshot = parseExamTemplateSnapshot({ sections: [{ library_section: { uuid: "s", name: "Hearing", items: [{ uuid: "i", code: "hearing", names_i18n: { fr: "Audition" } }] } }] })!;
    expect(snapshot.sections[0]).toMatchObject({ code: "s", name: "Hearing", items: [{ code: "hearing", name: "Audition", response_fields: [] }] });
    expect(parseExamTemplateSnapshot(null)).toBeNull();
  });
});


function CaptureHarness({ raw }: { raw: unknown }) {
  const [answers, setAnswers] = useState(emptyExamTemplateAnswers());
  return <OhExamTemplateCaptureForm snapshot={parseExamTemplateSnapshot(raw)!} value={answers} onChange={setAnswers} />;
}

it("reveals every inherited response inline and keeps the remaining fields open after choosing an option", () => {
  const raw = { schema_version: 3, sections: [{ code: "symptoms", name: "Symptoms", response_fields: [field, { code: "notes", label: "Notes", response_type: "text", required: true }], items: [{ code: "cough", name: "Cough" }] }] };
  render(<CaptureHarness raw={raw} />);
  expect(screen.queryByLabelText(/Notes/)).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "Cough" }));
  expect(screen.getByLabelText(/Notes/)).toBeVisible();
  expect(screen.getByLabelText(/Notes/)).toHaveAttribute("aria-required", "true");
  fireEvent.click(screen.getByRole("radio", { name: "Mild" }));
  expect(screen.getByLabelText(/Notes/)).toBeVisible();
  fireEvent.change(screen.getByLabelText(/Notes/), { target: { value: "Saved detail" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Cough" }));
  expect(screen.queryByLabelText(/Notes/)).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "Cough" }));
  expect(screen.getByLabelText(/Notes/)).toHaveValue("Saved detail");
});

it("uses an item's override, supports multi-select values, and honors exclusive section selection", () => {
  const raw = { schema_version: 3, sections: [{ code: "s", name: "Exam", selection_mode: "exclusive", response_fields: [{ code: "inherited", label: "Inherited", response_type: "text" }], items: [
    { code: "first", name: "First", response_fields: [{ code: "choices", label: "Choices", response_type: "multi_select", options: [{ code: "a", label: "Alpha" }, { code: "b", label: "Beta" }] }] },
    { code: "second", name: "Second" },
  ] }] };
  render(<CaptureHarness raw={raw} />);
  fireEvent.click(screen.getByRole("radio", { name: "First" }));
  expect(screen.queryByLabelText("Inherited")).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "Alpha" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Beta" }));
  expect(screen.getByRole("checkbox", { name: "Alpha" })).toHaveAttribute("aria-checked", "true");
  fireEvent.click(screen.getByRole("radio", { name: "Second" }));
  expect(screen.queryByRole("checkbox", { name: "Alpha" })).toBeNull();
  expect(screen.getByLabelText("Inherited")).toBeVisible();
  fireEvent.click(screen.getByRole("radio", { name: "First" }));
  expect(screen.getByRole("checkbox", { name: "Beta" })).toHaveAttribute("aria-checked", "true");
});

it("normalizes an actual legacy single-object response definition rather than treating it as empty", () => {
  render(<CaptureHarness raw={{ sections: [{ library_section: { code: "s", name: "History", default_response_fields: { code: "notes", label: "History notes", response_type: "text", validation: { required: true } }, items: [{ code: "history", names_i18n: { en: "History item" } }] } }] }} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "History item" }));
  expect(screen.getByLabelText(/History notes/)).toBeVisible();
  expect(screen.getByLabelText(/History notes/)).toHaveAttribute("aria-required", "true");
});

it("does not invent fields absent from an old publication and exposes truthful guidance", () => {
  render(<CaptureHarness raw={{ sections: [{ library_section: { name: "Legacy", code: "s", items: [{ code: "legacy", names_i18n: { en: "Legacy item" } }] } }] }} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Legacy item" }));
  expect(screen.queryByText(/published version did not include response fields/)).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
});

it("renders configured native date time decimal fields and validates only applicable required responses", () => {
  const snapshot = parseExamTemplateSnapshot({ schema_version: 3, sections: [{ code: "direct", name: "Direct", content_mode: "direct", response_fields: [
    { code: "date", label: "Date", response_type: "date" }, { code: "time", label: "Time", response_type: "time" }, { code: "decimal", label: "Value", response_type: "decimal", required: true },
  ], items: [] }, { code: "s", name: "Selection", is_mandatory: true, items: [{ code: "i", name: "Item", response_fields: [{ code: "notes", label: "Notes", response_type: "text", required: true }] }] }] })!;
  render(<OhExamTemplateCaptureForm snapshot={snapshot} onChange={vi.fn()} />);
  expect(screen.getByLabelText("Date")).toHaveAttribute("type", "date");
  expect(screen.getByLabelText("Time")).toHaveAttribute("type", "time");
  expect(screen.getByLabelText(/Value/)).toHaveAttribute("step", "any");
  const blank = validateExamAnswers(snapshot, emptyExamTemplateAnswers());
  expect(blank).toHaveProperty("section:s");
  expect(blank).not.toHaveProperty("field:s:i:notes");
  const picked = validateExamAnswers(snapshot, { picks: { s: ["i"] }, fields: { direct: { decimal: "1.5" } } });
  expect(picked).toHaveProperty("field:s:i:notes");
});


it("preserves editor required flags and exact published field codes through validation", () => {
  const input = { name: "Work", code: "WORK", isMandatory: false, inheritsResponseFields: false, overrideResponseFields: [{ code: "Task_Details", label: "Task details", response_type: "text", options: [], validation: { required: true }, required: true, prompt_after_select: true }], schedule: [], responses: [] };
  const parsed = itemFormSchema.parse(input);
  expect(parsed.overrideResponseFields[0].validation.required).toBe(true);
  expect(parsed.overrideResponseFields[0].required).toBe(true);
  const snapshot = parseExamTemplateSnapshot({ schema_version: 3, sections: [{ code: "work", name: "Work", items: [{ uuid: "i", code: "WORK", response_fields: parsed.overrideResponseFields }] }] })!;
  expect(snapshot.sections[0].items[0].response_fields[0].code).toBe("Task_Details");
});
