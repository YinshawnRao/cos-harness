import { tool } from "ai";
import { createCosSession, resolveBucket, resolveRegion } from "@/lib/cos/client";
import { CosOperations } from "@/lib/cos/operations";
import { loadSettings, requireSettings } from "@/lib/settings/store";
import {
  buildImageProcessRule,
  buildTextWatermarkRule,
  defaultProcessedKey,
  isOverwriteTarget,
} from "@/lib/ci/rules";
import { evaluateToolApproval } from "./policy";
import {
  copyObjectInput,
  createPrefixInput,
  deleteObjectInput,
  getImageInfoInput,
  getSignedUrlInput,
  listBucketsInput,
  listObjectsInput,
  processImageInput,
  uploadFromUrlInput,
  watermarkTextInput,
} from "./policy";

async function ops() {
  const settings = requireSettings();
  const session = await createCosSession(settings.tencent);
  return {
    settings,
    session,
    operations: new CosOperations(session.cos),
    bucket: (override?: string) => resolveBucket(settings.tencent, override),
    region: () => resolveRegion(settings.tencent),
  };
}

function previewOnlyResult(url: string, expiresIn: number, rule: string) {
  return {
    mode: "preview_only" as const,
    previewUrl: url,
    expiresIn,
    rule,
    note: "未写回存储桶，仅生成带处理参数的限时预览 URL。",
  };
}

export async function createAgentTools() {
  return {
    list_buckets: tool({
      description: "列出当前账号可见的 COS 存储桶。",
      inputSchema: listBucketsInput,
      execute: async ({ region }) => {
        const ctx = await ops();
        return ctx.operations.listBuckets(region || ctx.region());
      },
    }),
    list_objects: tool({
      description:
        "列出存储桶中某个前缀下的对象。默认 Delimiter=/，CommonPrefixes 表示子目录。",
      inputSchema: listObjectsInput,
      execute: async ({ bucket, prefix, delimiter, marker, maxKeys }) => {
        const ctx = await ops();
        return ctx.operations.listObjects({
          bucket: ctx.bucket(bucket),
          region: ctx.region(),
          prefix,
          delimiter: delimiter ?? "/",
          marker,
          maxKeys,
        });
      },
    }),
    upload_from_url: tool({
      description:
        "从可访问的 HTTP(S) URL 拉取文件并上传到 COS。本地文件请让用户使用聊天框的上传按钮。",
      inputSchema: uploadFromUrlInput,
      execute: async ({ sourceUrl, key, bucket, contentType }) => {
        const ctx = await ops();
        const targetKey =
          key?.replace(/^\/+/, "") ||
          `uploads/${Date.now()}-${filenameFromUrl(sourceUrl)}`;
        const response = await fetch(sourceUrl, { redirect: "follow" });
        if (!response.ok) {
          throw new Error(`下载源文件失败：HTTP ${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const uploaded = await ctx.operations.uploadObject({
          bucket: ctx.bucket(bucket),
          region: ctx.region(),
          key: targetKey,
          body: buffer,
          contentType:
            contentType || response.headers.get("content-type") || undefined,
        });
        return { ...uploaded, bytes: buffer.length, sourceUrl };
      },
    }),
    get_signed_url: tool({
      description: "生成对象的限时签名下载/预览 URL。私有桶必须用此工具才能预览。",
      inputSchema: getSignedUrlInput,
      execute: async ({ key, bucket, expiresIn, previewRule }) => {
        const ctx = await ops();
        return ctx.operations.getSignedUrl({
          bucket: ctx.bucket(bucket),
          region: ctx.region(),
          key,
          expiresIn,
          queryString: previewRule,
        });
      },
    }),
    delete_object: tool({
      description: "删除单个对象。必须等用户在界面确认后才会真正执行。",
      inputSchema: deleteObjectInput,
      execute: async ({ key, bucket }) => {
        const ctx = await ops();
        return ctx.operations.deleteObject({
          bucket: ctx.bucket(bucket),
          region: ctx.region(),
          key,
        });
      },
    }),
    copy_object: tool({
      description: "复制或重命名对象（同桶 CopyObject）。若目标键已存在，需用户确认覆盖。",
      inputSchema: copyObjectInput,
      execute: async ({ sourceKey, targetKey, bucket }) => {
        const ctx = await ops();
        const resolvedBucket = ctx.bucket(bucket);
        return ctx.operations.copyObject({
          bucket: resolvedBucket,
          region: ctx.region(),
          sourceKey,
          targetKey,
        });
      },
    }),
    create_prefix: tool({
      description: "创建目录前缀：上传一个以 / 结尾的空占位对象。",
      inputSchema: createPrefixInput,
      execute: async ({ prefix, bucket }) => {
        const ctx = await ops();
        const key = prefix.endsWith("/") ? prefix : `${prefix}/`;
        return ctx.operations.uploadObject({
          bucket: ctx.bucket(bucket),
          region: ctx.region(),
          key,
          body: Buffer.alloc(0),
          contentType: "application/x-directory",
        });
      },
    }),
    get_image_info: tool({
      description: "查询已在 COS 中的图片基本信息（格式、宽高、大小等）。需要桶已绑定数据万象。",
      inputSchema: getImageInfoInput,
      execute: async ({ key, bucket }) => {
        const ctx = await ops();
        return ctx.operations.getImageInfo({
          bucket: ctx.bucket(bucket),
          region: ctx.region(),
          key,
        });
      },
    }),
    process_image: tool({
      description:
        "对桶中已有图片做同步基础处理：缩放、裁剪、格式转换、质量。默认写入新键，不覆盖原图。preview_only 只返回签名预览 URL。",
      inputSchema: processImageInput,
      execute: async (input) => {
        const ctx = await ops();
        const bucket = ctx.bucket(input.bucket);
        const region = ctx.region();
        const rule = buildImageProcessRule({
          width: input.width,
          height: input.height,
          percent: input.percent,
          crop:
            input.cropWidth && input.cropHeight
              ? {
                  width: input.cropWidth,
                  height: input.cropHeight,
                  x: input.cropX,
                  y: input.cropY,
                }
              : undefined,
          format: input.format,
          quality: input.quality,
        });
        if (input.writeMode === "preview_only") {
          const signed = await ctx.operations.getSignedUrl({
            bucket,
            region,
            key: input.key,
            queryString: rule,
          });
          return previewOnlyResult(signed.url, signed.expiresIn, rule);
        }
        const targetKey =
          input.writeMode === "overwrite"
            ? input.key
            : input.targetKey || defaultProcessedKey(input.key);
        const processed = await ctx.operations.processImage({
          bucket,
          region,
          key: input.key,
          targetKey,
          rule,
        });
        const signed = await ctx.operations.getSignedUrl({
          bucket,
          region,
          key: targetKey,
        });
        return { ...processed, previewUrl: signed.url, expiresIn: signed.expiresIn };
      },
    }),
    watermark_text: tool({
      description: "为桶中图片添加文字水印。默认写入新键。需要桶已绑定数据万象。",
      inputSchema: watermarkTextInput,
      execute: async (input) => {
        const ctx = await ops();
        const bucket = ctx.bucket(input.bucket);
        const region = ctx.region();
        const rule = buildTextWatermarkRule({
          text: input.text,
          fontSize: input.fontSize,
          fill: input.fill,
          gravity: input.gravity,
          dx: input.dx,
          dy: input.dy,
        });
        if (input.writeMode === "preview_only") {
          const signed = await ctx.operations.getSignedUrl({
            bucket,
            region,
            key: input.key,
            queryString: rule,
          });
          return previewOnlyResult(signed.url, signed.expiresIn, rule);
        }
        const targetKey =
          input.writeMode === "overwrite"
            ? input.key
            : input.targetKey || defaultProcessedKey(input.key, "watermark");
        const processed = await ctx.operations.processImage({
          bucket,
          region,
          key: input.key,
          targetKey,
          rule,
        });
        const signed = await ctx.operations.getSignedUrl({
          bucket,
          region,
          key: targetKey,
        });
        return { ...processed, previewUrl: signed.url, expiresIn: signed.expiresIn };
      },
    }),
  };
}

export async function buildToolApproval() {
  return {
    delete_object: "user-approval" as const,
    copy_object: async (input: {
      sourceKey: string;
      targetKey: string;
      bucket?: string;
    }) => {
      const ctx = await ops();
      const exists = await ctx.operations.objectExists({
        bucket: ctx.bucket(input.bucket),
        region: ctx.region(),
        key: input.targetKey,
      });
      return evaluateToolApproval({
        toolName: "copy_object",
        input: input as unknown as Record<string, unknown>,
        destExists: exists,
      });
    },
    process_image: (input: Record<string, unknown>) =>
      evaluateToolApproval({ toolName: "process_image", input }),
    watermark_text: (input: Record<string, unknown>) =>
      evaluateToolApproval({ toolName: "watermark_text", input }),
  };
}

export function settingsReady(): boolean {
  try {
    return Boolean(loadSettings());
  } catch {
    return false;
  }
}

function filenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split("/").filter(Boolean).pop() || "download.bin";
    return decodeURIComponent(name).slice(0, 180);
  } catch {
    return "download.bin";
  }
}

export { isOverwriteTarget };
