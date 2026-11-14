/**
 * The origin employees use to reach this web app, for links sent outside the app
 * (e.g. emailed employee form links). Honours the reverse proxy's forwarded host/proto.
 */
export function publicAppOrigin(request: Request): string | null {
  try {
    const url = new URL(request.url);
    const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || url.host;
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "");
    if (!host || !/^https?$/.test(proto)) return null;
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}
