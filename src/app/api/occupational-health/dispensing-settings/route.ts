import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { hmisApiRequest } from "@/lib/server/hmis-api";
import { requireAccessToken } from "@/lib/server/require-access-token";

const UPSTREAM = "/oh/dispensing-settings/";

export async function GET() {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }
    const data = await hmisApiRequest<unknown>(UPSTREAM, {
      token: auth.accessToken,
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }
    const body = await request.json();
    const data = await hmisApiRequest<unknown>(UPSTREAM, {
      method: "PUT",
      token: auth.accessToken,
      body,
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }
    const body = await request.json();
    const data = await hmisApiRequest<unknown>(UPSTREAM, {
      method: "PATCH",
      token: auth.accessToken,
      body,
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}
