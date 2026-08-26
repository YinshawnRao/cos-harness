import { NextResponse } from "next/server";
import { apiError, withCosOps } from "@/lib/cos/with-session";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "缺少对象键" }, { status: 400 });
    }
    const ctx = await withCosOps();
    const info = await ctx.operations.getImageInfo({
      bucket: ctx.bucket(url.searchParams.get("bucket") || undefined),
      region: ctx.region(),
      key,
    });
    return NextResponse.json({ key, ...info });
  } catch (error) {
    logger.error("读取图片信息失败", error);
    return NextResponse.json(apiError(error, "读取图片信息失败"), { status: 400 });
  }
}
