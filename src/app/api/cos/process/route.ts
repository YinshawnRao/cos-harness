import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, withCosOps } from "@/lib/cos/with-session";
import { logger } from "@/lib/logger";
import {
  buildImageProcessRule,
  buildTextWatermarkRule,
  defaultProcessedKey,
} from "@/lib/ci/rules";
import { STAGE_PREVIEW_RULE } from "@/lib/studio/files";

const schema = z.object({
  key: z.string().min(1),
  bucket: z.string().optional(),
  action: z.enum(["thumbnail", "webp", "watermark", "preview"]),
  text: z.string().optional(),
  writeMode: z.enum(["new_key", "preview_only"]).optional().default("new_key"),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const ctx = await withCosOps();
    const bucket = ctx.bucket(body.bucket);
    const region = ctx.region();

    const rule = ruleFor(body.action, body.text);
    const original = await ctx.operations.getSignedUrl({
      bucket,
      region,
      key: body.key,
      queryString: STAGE_PREVIEW_RULE,
    });

    if (body.writeMode === "preview_only" || body.action === "preview") {
      const preview = await ctx.operations.getSignedUrl({
        bucket,
        region,
        key: body.key,
        queryString: rule,
      });
      return NextResponse.json({
        mode: "preview_only",
        bucket,
        sourceKey: body.key,
        rule,
        originalUrl: original.url,
        processedUrl: preview.url,
        expiresIn: preview.expiresIn,
      });
    }

    const suffix = body.action === "watermark" ? "watermark" : body.action;
    const targetKey = defaultProcessedKey(body.key, suffix);
    const processed = await ctx.operations.processImage({
      bucket,
      region,
      key: body.key,
      targetKey,
      rule,
    });
    const resultUrl = await ctx.operations.getSignedUrl({
      bucket,
      region,
      key: targetKey,
    });
    return NextResponse.json({
      mode: "new_key",
      ...processed,
      originalUrl: original.url,
      processedUrl: resultUrl.url,
      expiresIn: resultUrl.expiresIn,
    });
  } catch (error) {
    logger.error("图片处理失败", error);
    return NextResponse.json(apiError(error, "图片处理失败"), { status: 400 });
  }
}

function ruleFor(action: z.infer<typeof schema>["action"], text?: string) {
  if (action === "thumbnail") return buildImageProcessRule({ width: 800 });
  if (action === "webp") return buildImageProcessRule({ format: "webp", quality: 82 });
  if (action === "preview") return buildImageProcessRule({ width: 1200, quality: 85 });
  if (!text?.trim()) throw new Error("请填写水印文字。");
  return buildTextWatermarkRule({ text, fill: "#FFFFFF", gravity: "southeast" });
}
