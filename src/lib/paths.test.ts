import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureDataDir, getDataDir, masterKeyPath, settingsPath } from "./paths";

describe("data paths", () => {
  const original = process.env.DATA_DIR;

  afterEach(() => {
    if (original === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = original;
  });

  it("uses DATA_DIR when set (desktop userData / docker volume)", () => {
    const dir = path.join(os.tmpdir(), `cos-harness-userdata-${process.pid}`);
    process.env.DATA_DIR = dir;
    expect(getDataDir()).toBe(dir);
    expect(settingsPath()).toBe(path.join(dir, "settings.enc"));
    expect(masterKeyPath()).toBe(path.join(dir, ".master.key"));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("falls back to cwd/data without DATA_DIR", () => {
    delete process.env.DATA_DIR;
    expect(getDataDir()).toBe(path.join(process.cwd(), "data"));
  });

  it("ensureDataDir creates the user-data folder with restricted mode", () => {
    const dir = path.join(os.tmpdir(), `cos-harness-ensure-${process.pid}`);
    fs.rmSync(dir, { recursive: true, force: true });
    process.env.DATA_DIR = dir;
    expect(ensureDataDir()).toBe(dir);
    const stat = fs.statSync(dir);
    expect(stat.isDirectory()).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
