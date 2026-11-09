import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const data = await ohServiceRequest(`/workforce-forms/${token}`);
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const data = await ohServiceRequest(`/workforce-forms/${token}`, {
      method: "PATCH",
      body: await request.json(),
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}
