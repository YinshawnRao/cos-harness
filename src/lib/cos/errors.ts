export type CosClientError = {
  statusCode?: number;
  code?: string;
  message: string;
  hint?: string;
};

export function parseCosError(error: unknown): CosClientError {
  const anyErr = error as {
    statusCode?: number;
    code?: string;
    message?: string;
    error?: string | { Code?: string; Message?: string };
  };

  const nested =
    typeof anyErr?.error === "object" && anyErr.error
      ? anyErr.error
      : undefined;

  const code = String(anyErr?.code || nested?.Code || "").trim();
  const message = String(
    anyErr?.message || nested?.Message || (typeof anyErr?.error === "string" ? anyErr.error : "") ||
      (error instanceof Error ? error.message : "未知错误"),
  ).trim();

  const blob = `${code} ${message}`.toLowerCase();
  const hint = inferHint(code, blob, anyErr?.statusCode);

  return {
    statusCode: anyErr?.statusCode,
    code: code || undefined,
    message: message || "COS 请求失败",
    hint,
  };
}

function inferHint(code: string, blob: string, statusCode?: number): string | undefined {
  if (
    blob.includes("imageprocess") ||
    blob.includes("image_process") ||
    blob.includes("ci is not") ||
    blob.includes("not bind") ||
    blob.includes("数据万象") ||
    blob.includes("unbound") ||
    (blob.includes("nosuch") && blob.includes("process"))
  ) {
    return "该存储桶可能未绑定数据万象（Cloud Infinite）。请在腾讯云控制台为桶开通 CI 后再试。";
  }
  if (
    code === "AccessDenied" ||
    blob.includes("access denied") ||
    blob.includes("signaturedoesnotmatch") ||
    statusCode === 403
  ) {
    return "请核对 SecretId / SecretKey / 地域，以及子账号是否具备对应 COS/CI 权限。";
  }
  if (code === "NoSuchBucket" || blob.includes("nosuchbucket")) {
    return "存储桶不存在，或 Bucket 名称不是 BucketName-APPID 形式，或地域选错。";
  }
  if (code === "NoSuchKey" || blob.includes("nosuchkey")) {
    return "对象键不存在，请先列出前缀确认路径。";
  }
  if (blob.includes("invalidregion") || blob.includes("incorrect region")) {
    return "地域与存储桶不匹配。请在设置中填写该桶的实际地域，例如 ap-guangzhou。";
  }
  return undefined;
}

export function formatCosError(error: unknown): string {
  const parsed = parseCosError(error);
  const parts = [parsed.message];
  if (parsed.code) parts.unshift(`[${parsed.code}]`);
  if (parsed.hint) parts.push(parsed.hint);
  return parts.join(" ");
}

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}
