export const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "heic",
  "heif",
  "avif",
  "tpg",
] as const;

export const THUMBNAIL_RULE = "imageMogr2/thumbnail/240x";
export const STAGE_PREVIEW_RULE = "imageMogr2/thumbnail/1600x";

export function extensionOf(key: string): string {
  const name = objectName(key);
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "";
  return name.slice(dot + 1).toLowerCase();
}

export function isImageKey(key: string): boolean {
  return (IMAGE_EXTENSIONS as readonly string[]).includes(extensionOf(key));
}

export function isCiProcessableKey(key: string): boolean {
  const ext = extensionOf(key);
  return ext !== "" && ext !== "gif" && isImageKey(key);
}

export function objectName(key: string): string {
  const trimmed = key.replace(/\/+$/, "");
  const parts = trimmed.split("/").filter(Boolean);
  return parts.at(-1) || key;
}

export function parentPrefix(key: string): string {
  const normalized = key.replace(/^\/+/, "");
  const slash = normalized.lastIndexOf("/");
  if (slash < 0) return "";
  return normalized.slice(0, slash + 1);
}

export function prefixLabel(prefix: string): string {
  const trimmed = prefix.replace(/\/+$/, "");
  const parts = trimmed.split("/").filter(Boolean);
  return parts.at(-1) || prefix;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export function formatModified(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function isFolderPlaceholder(key: string, prefix: string): boolean {
  if (key.endsWith("/") && (!key.replace(/\/+$/, "").includes(".") || key === prefix)) {
    return true;
  }
  return Boolean(prefix) && key === prefix;
}
