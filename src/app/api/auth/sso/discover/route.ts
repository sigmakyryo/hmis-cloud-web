import { AUTH_API_PATHS } from "@/constants/auth-api";
import type { SsoDiscoverResponse } from "@/features/auth/types/auth.types";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { hmisApiRequest } from "@/lib/server/hmis-api";

type RequestBody = {
  email?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    if (!body.email?.trim()) {
      return bffSuccess({ message: "Email is required." }, 400);
    }

    const email = body.email.trim().toLowerCase();
    const data = await hmisApiRequest<SsoDiscoverResponse>(
      AUTH_API_PATHS.ssoDiscover,
      {
        method: "POST",
        body: { email },
        // Local Windows↔WSL localhost can take 30–60s on a cold hop.
        timeoutMs: 90_000,
      },
    );

    if (data.mode === "sso") {
      // Keep the first hop same-origin; BFF login route 302s to Django → IdP.
      return bffSuccess({
        mode: "sso",
        redirect_url: `/api/auth/sso/saml/login?email=${encodeURIComponent(email)}`,
      } satisfies SsoDiscoverResponse);
    }

    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}
