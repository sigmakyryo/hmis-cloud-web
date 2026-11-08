/** Keep navigation local to the document, never scroll the surrounding app. */
export function scrollToCertificateSection(attachmentUuid: string, align = true, itemUuid?: string) {
  const container = document.getElementById("template-editor-viewport") ?? document.getElementById("certificate-editor-viewport");
  const item = itemUuid ? document.getElementById(`template-editor-item-${attachmentUuid}-${itemUuid}`) : null;
  const section = item ?? document.getElementById(`section-${attachmentUuid}`) ?? document.getElementById(`certificate-editor-section-${attachmentUuid}`);
  if (!container || !section || !container.contains(section)) return;
  const inset = container.id === "template-editor-viewport" ? 48 : 24;
  const bounds = container.getBoundingClientRect();
  const target = section.getBoundingClientRect();
  if (align || target.top < bounds.top + inset || target.top >= bounds.bottom - 48) {
    container.scrollTo?.({
      top: Math.max(0, container.scrollTop + target.top - bounds.top - inset),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }
}
