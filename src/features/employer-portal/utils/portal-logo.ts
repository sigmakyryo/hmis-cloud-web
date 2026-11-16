/**
 * The logo to show for a clinic. A logo uploaded for the portal itself wins, then the organisation logo
 * from Settings > Organization. Only http(s) addresses and image data URIs are used.
 */
export function pickPortalLogo(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && /^(https?:\/\/|data:image\/)/i.test(value)) {
      return value;
    }
  }
  return null;
}
