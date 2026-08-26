import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, withCosOps } from "@/lib/cos/with-session";
import { logger } from "@/lib/logger";

const schema = z.object({
  key: z.string().min(1),
  bucket: z.string().optional(),
  confirmed: z.literal(true),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const ctx = await withCosOps();
    const result = await ctx.operations.deleteObject({
      bucket: ctx.bucket(body.bucket),
      region: ctx.region(),
      key: body.key,
    });
    return NextResponse.json(result);
  } catch (error) {
    logger.error("删除对象失败", error);
    return NextResponse.json(apiError(error, "删除对象失败"), { status: 400 });
  }
}
