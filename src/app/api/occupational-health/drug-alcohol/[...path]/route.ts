import { drugAlcoholProxy } from "@/lib/server/drug-alcohol-bff";

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: Ctx) {
  return drugAlcoholProxy("GET", request, (await context.params).path ?? []);
}

export async function POST(request: Request, context: Ctx) {
  return drugAlcoholProxy("POST", request, (await context.params).path ?? []);
}

export async function PATCH(request: Request, context: Ctx) {
  return drugAlcoholProxy("PATCH", request, (await context.params).path ?? []);
}
