import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { hmisApiRequest } from "@/lib/server/hmis-api";
import { requireAccessToken } from "@/lib/server/require-access-token";

export async function handleClinicalUpload<T>(
  request: Request,
  upstreamPath: string,
) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }

    const body = await request.formData();
    const data = await hmisApiRequest<T>(upstreamPath, {
      method: "POST",
      token: auth.accessToken,
      body,
    });
    return bffSuccess(data, 201);
  } catch (error) {
    return bffError(error);
  }
}
