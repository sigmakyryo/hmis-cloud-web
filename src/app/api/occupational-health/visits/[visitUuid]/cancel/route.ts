import { ohProxyPostHandler } from "@/lib/server/occupational-health-bff";

export async function POST(request: Request, context: { params: Promise<{ visitUuid: string }> }) {
  const { visitUuid: uuid } = await context.params;
  return ohProxyPostHandler(`/oh/visits/${encodeURIComponent(uuid)}/cancel`, request);
}
