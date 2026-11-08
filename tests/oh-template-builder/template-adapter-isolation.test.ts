import { beforeEach, expect, it, vi } from "vitest";
import { getTemplateAdapter } from "@/features/oh-template-builder/lib/templateAdapters";
import { fetchOhCofTemplateSections, fetchOhExamTemplateSections, fetchOhLibrarySectionItemsPage, fetchOhLibrarySections } from "@/features/occupational-health/services/oh.service";
vi.mock("@/features/occupational-health/services/oh.service", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/features/occupational-health/services/oh.service")>(),
  fetchOhCofTemplateSections: vi.fn(), fetchOhExamTemplateSections: vi.fn(), fetchOhLibrarySectionItemsPage: vi.fn(), fetchOhLibrarySections: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());
it.each(["certificate", "exam"] as const)("rejects other template attachments in %s responses", async (kind) => {
  const rows = ["previous", "new"].map((template, id) => ({ id, uuid: `attachment-${template}`, template, library_section: `section-${template}`, sort_order: id, active: true }));
  vi.mocked(fetchOhCofTemplateSections).mockResolvedValue(rows);
  vi.mocked(fetchOhExamTemplateSections).mockResolvedValue(rows);
  const result = await getTemplateAdapter(kind).listAttachments("new");
  expect(result.map((row) => row.uuid)).toEqual(["attachment-new"]);
});
it("rejects items belonging to another library section", async () => {
  vi.mocked(fetchOhLibrarySections).mockResolvedValue([]);
  vi.mocked(fetchOhLibrarySectionItemsPage).mockResolvedValue({ results: ["previous", "new"].map((section, id) => ({ id, uuid: `item-${section}`, section, code: section, names_i18n: { en: section }, override_response_fields: [], sort_order: id, active: true })), pagination: null });
  const result = await getTemplateAdapter("certificate").listItems("new");
  expect(result.items.map((row) => row.uuid)).toEqual(["item-new"]);
});
