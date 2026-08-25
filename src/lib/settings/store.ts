import fs from "node:fs";
import { decryptJson, encryptJson } from "../crypto";
import { maskSecret } from "../redact";
import { settingsPath } from "../paths";
import {
  settingsPatchSchema,
  storedSettingsSchema,
  type PublicSettings,
  type SettingsPatch,
  type StoredSettings,
} from "./schema";

function emptyPublic(): PublicSettings {
  return {
    configured: false,
    llm: {
      baseUrl: "",
      model: "",
      apiKeySet: false,
      apiKeyMasked: "",
    },
    tencent: {
      secretIdMasked: "",
      secretIdSet: false,
      secretKeySet: false,
      region: "",
      bucket: "",
      appId: "",
    },
    updatedAt: null,
  };
}

export function loadSettings(): StoredSettings | null {
  const file = settingsPath();
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file);
  const parsed = decryptJson<unknown>(raw);
  return storedSettingsSchema.parse(parsed);
}

export function toPublicSettings(settings: StoredSettings | null): PublicSettings {
  if (!settings) return emptyPublic();
  return {
    configured: true,
    llm: {
      baseUrl: settings.llm.baseUrl,
      model: settings.llm.model,
      apiKeySet: Boolean(settings.llm.apiKey),
      apiKeyMasked: maskSecret(settings.llm.apiKey),
    },
    tencent: {
      secretIdMasked: maskSecret(settings.tencent.secretId),
      secretIdSet: Boolean(settings.tencent.secretId),
      secretKeySet: Boolean(settings.tencent.secretKey),
      region: settings.tencent.region,
      bucket: settings.tencent.bucket,
      appId: settings.tencent.appId ?? "",
    },
    updatedAt: settings.updatedAt,
  };
}

export function saveSettingsPatch(patchInput: unknown): PublicSettings {
  const patch = settingsPatchSchema.parse(patchInput);
  const current = loadSettings();
  const merged = mergeSettings(current, patch);
  const parsed = storedSettingsSchema.parse(merged);
  fs.writeFileSync(settingsPath(), encryptJson(parsed), { mode: 0o600 });
  return toPublicSettings(parsed);
}

function mergeSettings(
  current: StoredSettings | null,
  patch: SettingsPatch,
): StoredSettings {
  const llm = {
    baseUrl: patch.llm?.baseUrl ?? current?.llm.baseUrl ?? "",
    apiKey: keepSecret(patch.llm?.apiKey, current?.llm.apiKey),
    model: patch.llm?.model ?? current?.llm.model ?? "",
  };
  const tencent = {
    secretId: keepSecret(patch.tencent?.secretId, current?.tencent.secretId),
    secretKey: keepSecret(patch.tencent?.secretKey, current?.tencent.secretKey),
    region: patch.tencent?.region ?? current?.tencent.region ?? "",
    bucket: patch.tencent?.bucket ?? current?.tencent.bucket ?? "",
    appId: patch.tencent?.appId ?? current?.tencent.appId ?? "",
  };
  return {
    llm,
    tencent,
    updatedAt: new Date().toISOString(),
  };
}

function keepSecret(incoming: string | undefined, existing: string | undefined): string {
  if (incoming == null) return existing ?? "";
  if (incoming.trim() === "") return existing ?? "";
  if (incoming.includes("••••")) return existing ?? "";
  return incoming;
}

export function requireSettings(): StoredSettings {
  const settings = loadSettings();
  if (!settings) {
    throw new Error("尚未保存配置。请先在「设置」页填写模型与腾讯云凭证。");
  }
  if (!settings.llm.apiKey || !settings.llm.baseUrl || !settings.llm.model) {
    throw new Error("LLM 配置不完整：需要 Base URL、API Key 和模型名。");
  }
  if (
    !settings.tencent.secretId ||
    !settings.tencent.secretKey ||
    !settings.tencent.region ||
    !settings.tencent.bucket
  ) {
    throw new Error("腾讯云配置不完整：需要 SecretId、SecretKey、地域和默认存储桶。");
  }
  return settings;
}
