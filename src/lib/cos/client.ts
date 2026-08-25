import COS from "cos-nodejs-sdk-v5";
import type { TencentSettings } from "@/lib/settings/schema";
import { trySts, type CredentialMode } from "./sts";

export type CosSession = {
  cos: COS;
  mode: CredentialMode;
  stsError?: string;
  settings: TencentSettings;
};

export async function createCosSession(
  settings: TencentSettings,
): Promise<CosSession> {
  const sts = await trySts(settings);
  if (sts.ok) {
    return {
      cos: new COS({
        SecretId: sts.credential.tmpSecretId,
        SecretKey: sts.credential.tmpSecretKey,
        SecurityToken: sts.credential.sessionToken,
        Protocol: "https:",
      }),
      mode: "sts",
      settings,
    };
  }

  return {
    cos: new COS({
      SecretId: settings.secretId,
      SecretKey: settings.secretKey,
      Protocol: "https:",
    }),
    mode: "long-term",
    stsError: sts.error,
    settings,
  };
}

export function resolveBucket(settings: TencentSettings, bucket?: string): string {
  const value = (bucket || settings.bucket).trim();
  if (!value) {
    throw new Error("未指定存储桶，请在设置中填写默认 Bucket（BucketName-APPID）。");
  }
  return value;
}

export function resolveRegion(settings: TencentSettings, region?: string): string {
  return (region || settings.region).trim();
}
