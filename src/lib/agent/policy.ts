import { z } from "zod";
import { FORBIDDEN_TOOL_SECRET_FIELDS } from "@/lib/redact";
import { isOverwriteTarget } from "@/lib/ci/rules";

export const DESTRUCTIVE_TOOLS = ["delete_object"] as const;

export type ApprovalDecision = "not-applicable" | "user-approval";

export type ToolApprovalInput = {
  toolName: string;
  input: Record<string, unknown>;
  destExists?: boolean;
};

export function evaluateToolApproval(params: ToolApprovalInput): ApprovalDecision {
  if (params.toolName === "delete_object") {
    return "user-approval";
  }
  if (params.toolName === "copy_object") {
    return params.destExists ? "user-approval" : "not-applicable";
  }
  if (params.toolName === "process_image" || params.toolName === "watermark_text") {
    const sourceKey = String(params.input.key ?? "");
    const targetKey =
      typeof params.input.targetKey === "string" ? params.input.targetKey : undefined;
    const writeMode =
      typeof params.input.writeMode === "string" ? params.input.writeMode : undefined;
    return isOverwriteTarget(sourceKey, targetKey, writeMode)
      ? "user-approval"
      : "not-applicable";
  }
  return "not-applicable";
}

export function assertNoSecretFields(schemaShape: Record<string, unknown>): string[] {
  const hits: string[] = [];
  for (const key of Object.keys(schemaShape)) {
    if (
      FORBIDDEN_TOOL_SECRET_FIELDS.some(
        (secret) => secret.toLowerCase() === key.toLowerCase(),
      )
    ) {
      hits.push(key);
    }
  }
  return hits;
}

export const listBucketsInput = z.object({
  region: z.string().optional().describe("可选，只列出该地域的桶"),
});

export const listObjectsInput = z.object({
  bucket: z.string().optional().describe("存储桶，默认用设置中的默认桶"),
  prefix: z.string().optional().describe("对象键前缀，文件夹以 / 结尾"),
  delimiter: z
    .string()
    .optional()
    .describe("默认 /，按目录分组；传空字符串可递归列出全部对象"),
  marker: z.string().optional().describe("分页标记 NextMarker"),
  maxKeys: z.number().int().min(1).max(1000).optional(),
});

export const uploadFromUrlInput = z.object({
  sourceUrl: z.string().url().describe("可公开访问的文件 URL"),
  key: z.string().optional().describe("目标对象键，默认根据 URL 文件名生成"),
  bucket: z.string().optional(),
  contentType: z.string().optional(),
});

export const getSignedUrlInput = z.object({
  key: z.string().describe("对象键"),
  bucket: z.string().optional(),
  expiresIn: z.number().int().min(60).max(86400).optional().describe("有效期秒数，默认 3600"),
  previewRule: z
    .string()
    .optional()
    .describe("可选 CI 处理参数，如 imageMogr2/thumbnail/800x，将签入预览 URL"),
});

export const deleteObjectInput = z.object({
  key: z.string().describe("要删除的对象键"),
  bucket: z.string().optional(),
});

export const copyObjectInput = z.object({
  sourceKey: z.string().describe("源对象键"),
  targetKey: z.string().describe("目标对象键"),
  bucket: z.string().optional(),
});

export const createPrefixInput = z.object({
  prefix: z.string().describe("目录前缀，例如 photos/2026/"),
  bucket: z.string().optional(),
});

export const getImageInfoInput = z.object({
  key: z.string().describe("已在桶中的图片对象键"),
  bucket: z.string().optional(),
});

export const processImageInput = z.object({
  key: z.string().describe("源图片对象键"),
  bucket: z.string().optional(),
  width: z.number().int().min(1).max(10000).optional(),
  height: z.number().int().min(1).max(10000).optional(),
  percent: z.number().int().min(1).max(1000).optional().describe("按原图百分比缩放，例如 50"),
  cropWidth: z.number().int().min(1).optional(),
  cropHeight: z.number().int().min(1).optional(),
  cropX: z.number().int().min(0).optional(),
  cropY: z.number().int().min(0).optional(),
  format: z
    .enum(["jpg", "jpeg", "png", "webp", "bmp", "gif", "heif", "avif", "tpg"])
    .optional(),
  quality: z.number().int().min(1).max(100).optional(),
  targetKey: z.string().optional().describe("写入的新对象键；默认生成不覆盖原图的新键"),
  writeMode: z
    .enum(["new_key", "overwrite", "preview_only"])
    .optional()
    .describe("默认 new_key。overwrite 会覆盖原图，必须经用户确认。preview_only 只返回带处理参数的签名 URL"),
});

export const watermarkTextInput = z.object({
  key: z.string().describe("源图片对象键"),
  text: z.string().min(1).describe("水印文字"),
  bucket: z.string().optional(),
  fontSize: z.number().int().min(8).max(1000).optional(),
  fill: z.string().optional().describe("十六进制颜色，如 #FFFFFF"),
  gravity: z
    .enum([
      "northwest",
      "north",
      "northeast",
      "west",
      "center",
      "east",
      "southwest",
      "south",
      "southeast",
    ])
    .optional(),
  dx: z.number().int().optional(),
  dy: z.number().int().optional(),
  targetKey: z.string().optional(),
  writeMode: z.enum(["new_key", "overwrite", "preview_only"]).optional(),
});

export const TOOL_INPUT_SCHEMAS = {
  list_buckets: listBucketsInput,
  list_objects: listObjectsInput,
  upload_from_url: uploadFromUrlInput,
  get_signed_url: getSignedUrlInput,
  delete_object: deleteObjectInput,
  copy_object: copyObjectInput,
  create_prefix: createPrefixInput,
  get_image_info: getImageInfoInput,
  process_image: processImageInput,
  watermark_text: watermarkTextInput,
} as const;
