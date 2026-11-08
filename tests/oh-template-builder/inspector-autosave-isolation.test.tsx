import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, expect, it, vi } from "vitest";
import { useInspectorAutosave } from "@/features/oh-template-builder/hooks/useInspectorAutosave";
const context = vi.hoisted(() => ({ registerPendingSave: vi.fn(() => vi.fn()) }));
vi.mock("@/features/oh-template-builder/hooks/useTemplateBuilder", () => ({ useTemplateBuilder: () => context }));
afterEach(() => vi.useRealTimers());
it("cancels a dirty inspector debounce when its template session unmounts", async () => {
  vi.useFakeTimers();
  const save = vi.fn().mockResolvedValue(true);
  const { result, unmount } = renderHook(() => {
    const form = useForm({ defaultValues: { name: "Original" } });
    useInspectorAutosave(form, save);
    return { form, dirty: form.formState.isDirty };
  });
  act(() => result.current.form.setValue("name", "First edit", { shouldDirty: true }));
  act(() => result.current.form.setValue("name", "Second edit", { shouldDirty: true }));
  expect(result.current.dirty).toBe(true);
  unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(save).not.toHaveBeenCalled();
});
