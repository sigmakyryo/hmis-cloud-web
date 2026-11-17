import { AUTH_API_PATHS } from "@/constants/auth-api";
import type { SsoContinueResponse } from "@/features/auth/types/auth.types";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { hmisApiRequest } from "@/lib/server/hmis-api";

type RequestBody = {
  code?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    if (!body.code?.trim()) {
      return bffSuccess({ message: "Continue code is required." }, 400);
    }

    const data = await hmisApiRequest<SsoContinueResponse>(
      AUTH_API_PATHS.ssoContinue,
      {
        method: "POST",
        body: { code: body.code.trim() },
      },
    );

    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}
