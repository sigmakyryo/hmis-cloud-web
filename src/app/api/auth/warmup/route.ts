import { AUTH_API_PATHS } from "@/constants/auth-api";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { hmisApiRequest } from "@/lib/server/hmis-api";

/**
 * Opens the Windows→WSL (or cold) hop to Django so the first real auth call
 * is not the one that pays a 30–60s localhost bridge delay.
 */
export async function GET() {
  try {
    await hmisApiRequest(AUTH_API_PATHS.ssoDiscover, {
      method: "POST",
      body: { email: "warmup@invalid.local" },
      timeoutMs: 90_000,
    });
    return bffSuccess({ ok: true });
  } catch (error) {
    // Still useful if Django rejected the body — the TCP path is warm.
    return bffError(error);
  }
}
