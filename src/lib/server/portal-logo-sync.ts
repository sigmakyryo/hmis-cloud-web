import sharp from "sharp";

import { isPrivateNetworkHostname, stripHostPort } from "@/constants/hosts";
import { HMIS_API_URL } from "@/constants/api";
import { HmisApiError } from "@/lib/server/hmis-api";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_DOWNLOAD_BYTES = 5 * 1024 * 1024;
/** The OH service accepts a data URI up to 280,000 characters. */
const MAX_DATA_URI_CHARS = 270_000;
const SIZES = [256, 160, 96] as const;
const IMAGE_TYPE = /^image\/(png|jpe?g|webp|gif|svg\+xml)(;|$)/i;

function apiOrigin(): URL | null {
  try {
    return HMIS_API_URL ? new URL(HMIS_API_URL) : null;
  } catch {
    return null;
  }
}

function isLocalName(hostname: string): boolean {
  const name = stripHostPort(hostname);
  return name === "localhost" || name.endsWith(".localhost") || name === "[::1]" || name === "0.0.0.0" || name.startsWith("127.") || isPrivateNetworkHostname(name);
}

/**
 * The organisation logo address becomes a server-side request, so it is checked first: http(s) only,
 * and never a local or private host unless it is the clinic's own API server.
 */
export function resolveLogoFetchUrl(logoUrl: string): URL {
  const api = apiOrigin();
  let url: URL;
  try {
    url = new URL(logoUrl, api ?? undefined);
  } catch {
    throw new HmisApiError("The organization logo address is not valid.", 422);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new HmisApiError("The organization logo address is not valid.", 422);
  }
  const isOwnApi = api !== null && url.host === api.host;
  if (!isOwnApi && isLocalName(url.hostname)) {
    throw new HmisApiError("The organization logo is not on a public address.", 422);
  }
  return url;
}

async function download(url: URL): Promise<Buffer> {
  const response = await fetch(url, {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { accept: "image/*" },
  });
  if (!response.ok) {
    throw new HmisApiError("The organization logo could not be downloaded.", 502);
  }
  if (!IMAGE_TYPE.test(response.headers.get("content-type") ?? "")) {
    throw new HmisApiError("The organization logo is not an image.", 422);
  }
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_DOWNLOAD_BYTES) {
    throw new HmisApiError("The organization logo file is too large.", 422);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_DOWNLOAD_BYTES) {
    throw new HmisApiError("The organization logo file is too large.", 422);
  }
  return bytes;
}

/** Shrinks any supported image to a small PNG data URI the OH service accepts. */
export async function toPortalLogoDataUri(image: Buffer): Promise<string> {
  for (const size of SIZES) {
    const png = await sharp(image, { limitInputPixels: 40_000_000 })
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const dataUri = `data:image/png;base64,${png.toString("base64")}`;
    if (dataUri.length <= MAX_DATA_URI_CHARS) {
      return dataUri;
    }
  }
  throw new HmisApiError("The organization logo is too detailed to use. Upload a simpler logo.", 422);
}

export async function organizationLogoDataUri(logoUrl: string): Promise<string> {
  const bytes = await download(resolveLogoFetchUrl(logoUrl));
  try {
    return await toPortalLogoDataUri(bytes);
  } catch (error) {
    if (error instanceof HmisApiError) {
      throw error;
    }
    console.error("Could not convert the organization logo", error);
    throw new HmisApiError("The organization logo could not be read as an image.", 422);
  }
}
