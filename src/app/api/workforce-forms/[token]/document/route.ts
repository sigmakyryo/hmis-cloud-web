import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const data = await ohServiceRequest(`/workforce-forms/${token}/document`, {
      method: "POST",
      body: await request.formData(),
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}
