import { afterEach, expect, it, vi } from "vitest";
import { resizeCertificateComposer } from "@/features/oh-template-builder/lib/resizeCertificateComposer";

afterEach(() => vi.restoreAllMocks());

function composer(scrollHeight: number) {
  const textarea = document.createElement("textarea");
  Object.assign(textarea.style, { lineHeight: "20px", paddingTop: "4px", paddingBottom: "4px", borderTopWidth: "1px", borderBottomWidth: "1px", boxSizing: "border-box", minHeight: "32px" });
  Object.defineProperty(textarea, "scrollHeight", { configurable: true, value: scrollHeight });
  return textarea;
}

it("grows wrapped text to five measured lines then scrolls without truncating text", () => {
  const textarea = composer(108);
  textarea.value = "Long wrapped text without any newline ".repeat(100);
  const original = textarea.value;
  resizeCertificateComposer(textarea);
  expect(textarea.style.height).toBe("110px");
  expect(textarea.style.maxHeight).toBe("110px");
  expect(textarea.style.overflowY).toBe("hidden");
  Object.defineProperty(textarea, "scrollHeight", { value: 408 });
  resizeCertificateComposer(textarea);
  expect(textarea.style.height).toBe("110px");
  expect(textarea.style.overflowY).toBe("auto");
  expect(textarea.value).toBe(original);
});

it("retains all newline text and shrinks back to the original compact minimum", () => {
  const textarea = composer(208);
  textarea.value = Array.from({ length: 10 }, (_, i) => `Line ${i}`).join("\n");
  resizeCertificateComposer(textarea);
  expect(textarea.value.split("\n")).toHaveLength(10);
  expect(textarea.style.overflowY).toBe("auto");
  textarea.value = "";
  Object.defineProperty(textarea, "scrollHeight", { value: 28 });
  resizeCertificateComposer(textarea);
  expect(textarea.style.height).toBe("32px");
  expect(textarea.style.overflowY).toBe("hidden");
});

it("uses computed padding and line-height rather than a fixed five-line pixel guess", () => {
  const textarea = composer(300);
  textarea.style.lineHeight = "24px";
  textarea.style.paddingTop = "6px";
  textarea.style.paddingBottom = "8px";
  resizeCertificateComposer(textarea);
  expect(textarea.style.maxHeight).toBe("136px");
});
