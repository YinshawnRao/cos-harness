import { NextResponse } from "next/server";
import { apiError, withCosOps } from "@/lib/cos/with-session";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await withCosOps();
    const buckets = await ctx.operations.listBuckets(ctx.region());
    return NextResponse.json({
      region: ctx.region(),
      defaultBucket: ctx.settings.tencent.bucket,
      buckets,
    });
  } catch (error) {
    logger.error("列出存储桶失败", error);
    return NextResponse.json(apiError(error, "列出存储桶失败"), { status: 400 });
  }
}
