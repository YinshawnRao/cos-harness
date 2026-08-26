import fs from "node:fs";
import path from "node:path";

export function getDataDir(): string {
  const fromEnv = process.env.DATA_DIR;
  if (fromEnv && fromEnv.trim() !== "") {
    return fromEnv;
  }
  return path.join(process.cwd(), "data");
}

export function ensureDataDir(): string {
  const dir = getDataDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

export function settingsPath(): string {
  return path.join(ensureDataDir(), "settings.enc");
}

export function masterKeyPath(): string {
  return path.join(ensureDataDir(), ".master.key");
}
