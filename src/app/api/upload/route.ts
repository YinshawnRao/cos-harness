import { NextResponse } from "next/server";
import { createCosSession, resolveBucket, resolveRegion } from "@/lib/cos/client";
import { CosOperations } from "@/lib/cos/operations";
import { requireSettings } from "@/lib/settings/store";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const settings = requireSettings();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择要上传的文件" }, { status: 400 });
    }
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "文件过大，当前上限 100MB" }, { status: 400 });
    }

    const requestedKey = String(form.get("key") || "").replace(/^\/+/, "");
    const prefix = String(form.get("prefix") || "").replace(/^\/+|\/+$/g, "");
    const safeName = file.name.replace(/[\\/]/g, "_") || "upload.bin";
    const key =
      requestedKey ||
      [prefix, `${Date.now()}-${safeName}`].filter(Boolean).join("/");

    const session = await createCosSession(settings.tencent);
    const operations = new CosOperations(session.cos);
    const bucket = resolveBucket(settings.tencent, String(form.get("bucket") || ""));
    const region = resolveRegion(settings.tencent);
    const body = Buffer.from(await file.arrayBuffer());
    const uploaded = await operations.uploadObject({
      bucket,
      region,
      key,
      body,
      contentType: file.type || undefined,
    });

    return NextResponse.json({
      ...uploaded,
      bytes: body.length,
      filename: file.name,
    });
  } catch (error) {
    logger.error("upload failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败" },
      { status: 400 },
    );
  }
}
