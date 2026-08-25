export type ProcessOptions = {
  width?: number;
  height?: number;
  percent?: number;
  crop?: { width: number; height: number; x?: number; y?: number };
  format?: "jpg" | "jpeg" | "png" | "webp" | "bmp" | "gif" | "heif" | "avif" | "tpg";
  quality?: number;
};

export type WatermarkOptions = {
  text: string;
  fontSize?: number;
  fill?: string;
  gravity?: string;
  dx?: number;
  dy?: number;
  dissolve?: number;
};

export function urlSafeBase64(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function appendImageMogr2(options: ProcessOptions): string[] {
  const parts: string[] = [];
  if (options.percent != null) {
    const scale = Math.min(1000, Math.max(1, Math.round(options.percent)));
    parts.push(`thumbnail/!${scale}p`);
  } else if (options.width || options.height) {
    const w = options.width ? String(options.width) : "";
    const h = options.height ? String(options.height) : "";
    parts.push(`thumbnail/${w}x${h}`);
  }
  if (options.crop) {
    const x = options.crop.x ?? 0;
    const y = options.crop.y ?? 0;
    parts.push(`cut/${options.crop.width}x${options.crop.height}x${x}x${y}`);
  }
  if (options.format) {
    parts.push(`format/${options.format === "jpeg" ? "jpg" : options.format}`);
  }
  if (options.quality != null) {
    const q = Math.min(100, Math.max(1, Math.round(options.quality)));
    parts.push(`quality/${q}`);
  }
  return parts;
}

export function buildImageProcessRule(options: ProcessOptions): string {
  const parts = appendImageMogr2(options);
  if (parts.length === 0) {
    throw new Error("至少指定一项处理：缩放、裁剪、格式或质量。");
  }
  return `imageMogr2/${parts.join("/")}`;
}

export function buildTextWatermarkRule(options: WatermarkOptions): string {
  if (!options.text.trim()) {
    throw new Error("水印文字不能为空。");
  }
  const parts = [
    "watermark/2",
    `text/${urlSafeBase64(options.text)}`,
    `fontsize/${options.fontSize ?? 20}`,
    `fill/${urlSafeBase64(options.fill ?? "#3D3D3D")}`,
    `gravity/${options.gravity ?? "southeast"}`,
    `dx/${options.dx ?? 20}`,
    `dy/${options.dy ?? 20}`,
    `dissolve/${options.dissolve ?? 90}`,
  ];
  return parts.join("/");
}

export function defaultProcessedKey(sourceKey: string, suffix = "processed"): string {
  const slash = sourceKey.lastIndexOf("/");
  const dir = slash >= 0 ? sourceKey.slice(0, slash + 1) : "";
  const name = slash >= 0 ? sourceKey.slice(slash + 1) : sourceKey;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
  return `${dir}${base}.${suffix}.${stamp}${ext}`;
}

export function isOverwriteTarget(sourceKey: string, targetKey?: string, writeMode?: string): boolean {
  if (writeMode === "overwrite") return true;
  if (!targetKey) return false;
  return normalizeKey(sourceKey) === normalizeKey(targetKey);
}

export function normalizeKey(key: string): string {
  return key.replace(/^\/+/, "").replace(/\/+$/, "");
}
