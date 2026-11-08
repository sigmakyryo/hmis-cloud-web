/** Keep navigation local to the document, never scroll the surrounding app. */
export function scrollToCertificateSection(attachmentUuid: string, align = true) {
  const container = document.getElementById("certificate-editor-viewport");
  const section = document.getElementById(`certificate-editor-section-${attachmentUuid}`);
  if (!container || !section || !container.contains(section)) return;
  const bounds = container.getBoundingClientRect();
  const target = section.getBoundingClientRect();
  if (align || target.top < bounds.top + 24 || target.top >= bounds.bottom - 48) {
    container.scrollTo({
      top: Math.max(0, container.scrollTop + target.top - bounds.top - 24),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }
}
