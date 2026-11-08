/** Measure wrapped visual lines, without modifying or limiting the prompt value. */
export function resizeCertificateComposer(textarea: HTMLTextAreaElement): void {
  const style = getComputedStyle(textarea);
  const lineHeight = parseFloat(style.lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;
  const pixels = (value: string) => parseFloat(value) || 0;
  const padding = pixels(style.paddingTop) + pixels(style.paddingBottom);
  const borders = pixels(style.borderTopWidth) + pixels(style.borderBottomWidth);
  const inset = style.boxSizing === "border-box" ? 0 : padding + borders;
  const maximum = lineHeight * 5 + padding + borders;
  const minimum = pixels(style.minHeight) + inset;
  textarea.style.maxHeight = `${maximum - inset}px`;
  textarea.style.height = "auto";
  const contentHeight = textarea.scrollHeight + borders;
  textarea.style.height = `${Math.min(maximum, Math.max(minimum, contentHeight)) - inset}px`;
  textarea.style.overflowY = contentHeight > maximum ? "auto" : "hidden";
}
