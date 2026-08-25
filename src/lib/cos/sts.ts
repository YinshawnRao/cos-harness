import STS from "qcloud-cos-sts";
import type { TencentSettings } from "@/lib/settings/schema";
import { logger } from "@/lib/logger";

export type StsCredential = {
  tmpSecretId: string;
  tmpSecretKey: string;
  sessionToken: string;
  expiredTime: number;
  startTime: number;
};

export type CredentialMode = "sts" | "long-term";

type CacheEntry = {
  credential: StsCredential;
  bucket: string;
  region: string;
};

let cache: CacheEntry | null = null;

const STS_ACTIONS = [
  "name/cos:GetService",
  "name/cos:GetBucket",
  "name/cos:HeadBucket",
  "name/cos:PutObject",
  "name/cos:PostObject",
  "name/cos:GetObject",
  "name/cos:HeadObject",
  "name/cos:DeleteObject",
  "name/cos:PutObjectCopy",
  "name/cos:InitiateMultipartUpload",
  "name/cos:ListMultipartUploads",
  "name/cos:ListParts",
  "name/cos:UploadPart",
  "name/cos:CompleteMultipartUpload",
  "name/cos:AbortMultipartUpload",
];

export function extractAppId(bucket: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  const idx = bucket.lastIndexOf("-");
  if (idx <= 0) return "";
  const suffix = bucket.slice(idx + 1);
  return /^\d+$/.test(suffix) ? suffix : "";
}

export async function getStsCredential(
  settings: TencentSettings,
): Promise<StsCredential> {
  const now = Math.floor(Date.now() / 1000);
  if (
    cache &&
    cache.bucket === settings.bucket &&
    cache.region === settings.region &&
    cache.credential.expiredTime - 120 > now
  ) {
    return cache.credential;
  }

  const appId = extractAppId(settings.bucket, settings.appId);
  const shortBucket =
    appId && settings.bucket.endsWith(`-${appId}`)
      ? settings.bucket.slice(0, -(appId.length + 1))
      : settings.bucket;

  const resources = appId
    ? [
        `qcs::cos:${settings.region}:uid/${appId}:${settings.bucket}/*`,
        `qcs::cos:${settings.region}:uid/${appId}:prefix//${appId}/${shortBucket}/*`,
        `qcs::cos:${settings.region}:uid/${appId}:${settings.bucket}`,
      ]
    : ["*"];

  const policy = {
    version: "2.0",
    statement: [
      {
        effect: "allow",
        action: STS_ACTIONS,
        resource: resources,
      },
    ],
  };

  const data = await STS.getCredential({
    secretId: settings.secretId,
    secretKey: settings.secretKey,
    durationSeconds: 1800,
    policy,
  });

  const credential: StsCredential = {
    tmpSecretId: data.credentials.tmpSecretId,
    tmpSecretKey: data.credentials.tmpSecretKey,
    sessionToken: data.credentials.sessionToken,
    expiredTime: data.expiredTime,
    startTime: data.startTime,
  };
  cache = { credential, bucket: settings.bucket, region: settings.region };
  return credential;
}

export function clearStsCache(): void {
  cache = null;
}

export async function trySts(
  settings: TencentSettings,
): Promise<{ ok: true; credential: StsCredential } | { ok: false; error: string }> {
  try {
    const credential = await getStsCredential(settings);
    return { ok: true, credential };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("STS 临时密钥申请失败，将回退到服务端长期密钥。", message);
    return { ok: false, error: message };
  }
}
