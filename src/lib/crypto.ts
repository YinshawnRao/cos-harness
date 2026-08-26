import crypto from "node:crypto";
import fs from "node:fs";
import { masterKeyPath } from "./paths";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function parseHexKey(value: string): Buffer | null {
  const trimmed = value.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) return null;
  return Buffer.from(trimmed, "hex");
}

export function getMasterKey(): Buffer {
  const fromEnv = process.env.SETTINGS_ENCRYPTION_KEY;
  if (fromEnv) {
    const parsed = parseHexKey(fromEnv);
    if (!parsed) {
      throw new Error(
        "SETTINGS_ENCRYPTION_KEY 必须是 64 位十六进制字符（32 字节 AES-256 密钥）。",
      );
    }
    return parsed;
  }

  const file = masterKeyPath();
  if (fs.existsSync(file)) {
    const parsed = parseHexKey(fs.readFileSync(file, "utf8"));
    if (!parsed) {
      throw new Error(
        `本地主密钥文件损坏，请删除 ${file} 后重启以重新生成。`,
      );
    }
    return parsed;
  }

  const key = crypto.randomBytes(KEY_BYTES);
  fs.writeFileSync(file, key.toString("hex"), { mode: 0o600 });
  return key;
}

export function encryptJson(value: unknown): Buffer {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]);
}

export function decryptJson<T>(payload: Buffer): T {
  if (payload.length < IV_BYTES + AUTH_TAG_BYTES + 1) {
    throw new Error("加密配置文件损坏。");
  }
  const key = getMasterKey();
  const iv = payload.subarray(0, IV_BYTES);
  const tag = payload.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const ciphertext = payload.subarray(IV_BYTES + AUTH_TAG_BYTES);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
