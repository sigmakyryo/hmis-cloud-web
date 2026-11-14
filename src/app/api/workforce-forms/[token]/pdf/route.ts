import { bffError } from "@/lib/server/bff-response";
import { HmisApiError } from "@/lib/server/hmis-api";
import { OH_SERVICE_URL } from "@/lib/server/oh-service";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!OH_SERVICE_URL) throw new HmisApiError("The occupational health service is unavailable.", 503);
    const upstream = await fetch(`${OH_SERVICE_URL}/workforce-forms/${encodeURIComponent(token)}/pdf`, {
      cache: "no-store",
    });
    if (!upstream.ok) throw new HmisApiError("This form export is unavailable.", upstream.status);
    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
        "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return bffError(error);
  }
}
