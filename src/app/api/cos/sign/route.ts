import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, withCosOps } from "@/lib/cos/with-session";
import { logger } from "@/lib/logger";

const schema = z.object({
  key: z.string().min(1),
  bucket: z.string().optional(),
  expiresIn: z.number().int().min(60).max(86400).optional(),
  queryString: z.string().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const ctx = await withCosOps();
    const signed = await ctx.operations.getSignedUrl({
      bucket: ctx.bucket(body.bucket),
      region: ctx.region(),
      key: body.key,
      expiresIn: body.expiresIn,
      queryString: body.queryString,
    });
    return NextResponse.json({
      ...signed,
      key: body.key,
      bucket: ctx.bucket(body.bucket),
    });
  } catch (error) {
    logger.error("签名 URL 失败", error);
    return NextResponse.json(apiError(error, "签名 URL 失败"), { status: 400 });
  }
}
