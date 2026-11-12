import { handlePublicPortal } from "@/lib/server/employer-portal-public";

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, ctx: Ctx) {
  return handlePublicPortal(request, (await ctx.params).path);
}

export async function POST(request: Request, ctx: Ctx) {
  return handlePublicPortal(request, (await ctx.params).path);
}
