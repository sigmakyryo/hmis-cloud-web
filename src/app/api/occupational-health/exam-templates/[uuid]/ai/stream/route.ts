import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { assistantStreamHttpError } from "@/features/oh-template-builder/lib/templateAiStream";
import { OH_SERVICE_URL } from "@/lib/server/oh-service";
import { bffError } from "@/lib/server/bff-response";
import { HmisApiError } from "@/lib/server/hmis-api";
import { requireAccessToken } from "@/lib/server/require-access-token";

type RouteContext = { params: Promise<{ uuid: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }
    if (!OH_SERVICE_URL) {
      throw new HmisApiError("The certificate assistant service is not configured on the server.", 503);
    }

    const { uuid } = await context.params;
    const body = await request.text();
    const upstream = await fetch(
      `${OH_SERVICE_URL}${OCCUPATIONAL_HEALTH_API_PATHS.ohExamTemplateAiStream(uuid)}`,
      {
        method: "POST",
        headers: {
          accept: "text/event-stream",
          "content-type": "application/json",
          "X-HMIS-Session": auth.accessToken,
        },
        body,
        cache: "no-store",
        signal: request.signal,
      },
    );

    if (!upstream.ok) {
      await upstream.body?.cancel();
      throw new HmisApiError(assistantStreamHttpError(upstream.status), upstream.status);
    }
    if (!upstream.body || !upstream.headers.get("content-type")?.toLowerCase().includes("text/event-stream")) {
      await upstream.body?.cancel();
      throw new HmisApiError("The certificate assistant returned an invalid stream response. Please try again.", 502);
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return bffError(error instanceof HmisApiError
      ? error
      : new HmisApiError(assistantStreamHttpError(502), 502));
  }
}
