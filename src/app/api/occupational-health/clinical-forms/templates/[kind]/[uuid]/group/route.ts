import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

export async function PATCH(request: Request, { params }: { params: Promise<{ kind: string; uuid: string }> }) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const { kind, uuid } = await params;
    const result = await ohServiceRequest(
      `/clinical-forms/templates/${encodeURIComponent(kind)}/${encodeURIComponent(uuid)}/group`,
      { method: "PATCH", token: auth.accessToken, body: await request.json() },
    );
    return bffSuccess(result);
  } catch (error) {
    return bffError(error);
  }
}
