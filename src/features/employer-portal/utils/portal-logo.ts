/**
 * The logo to show for a clinic. A logo uploaded for the portal itself wins, then the organisation logo
 * from Settings > Organization. Django stores that one as `/media/...`, which this app proxies, so a
 * same-origin `/media/` path is as good as a full address. Only those, http(s) and image data URIs are used.
 */
export function pickPortalLogo(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && /^(https?:\/\/|data:image\/|\/media\/)/i.test(value)) {
      return value;
    }
  }
  return null;
}
