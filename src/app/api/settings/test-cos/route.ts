import { NextResponse } from "next/server";
import { createCosSession } from "@/lib/cos/client";
import { CosOperations } from "@/lib/cos/operations";
import { requireSettings } from "@/lib/settings/store";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const settings = requireSettings();
    const session = await createCosSession(settings.tencent);
    const operations = new CosOperations(session.cos);
    const buckets = await operations.listBuckets(settings.tencent.region);
    const defaultBucket = buckets.find((item) => item.name === settings.tencent.bucket);
    let objectSample: { count: number } | null = null;
    try {
      const listed = await operations.listObjects({
        bucket: settings.tencent.bucket,
        region: settings.tencent.region,
        maxKeys: 5,
      });
      objectSample = { count: listed.objects.length + listed.prefixes.length };
    } catch (error) {
      logger.warn("默认桶列举失败", error);
      return NextResponse.json(
        {
          ok: false,
          credentialMode: session.mode,
          stsError: session.stsError,
          message: `密钥可用（已列出 ${buckets.length} 个桶），但默认桶 ${settings.tencent.bucket} 列举失败：${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      credentialMode: session.mode,
      stsError: session.stsError,
      bucketCount: buckets.length,
      defaultBucketFound: Boolean(defaultBucket),
      objectSample,
      message:
        session.mode === "sts"
          ? `COS 已连通（STS 临时密钥）。默认桶 ${settings.tencent.bucket} 可用。`
          : `COS 已连通（服务端长期密钥）。STS 申请失败：${session.stsError ?? "未知原因"}。默认桶 ${settings.tencent.bucket} 可用。`,
    });
  } catch (error) {
    logger.error("测试 COS 失败", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "测试 COS 失败",
      },
      { status: 400 },
    );
  }
}
