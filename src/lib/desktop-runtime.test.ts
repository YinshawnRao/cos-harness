import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const runtime = require("../../electron/runtime.cjs") as {
  LISTEN_HOST: string;
  PREFERRED_PORT: number;
  desktopDataDir: (userDataPath: string) => string;
  isAppOrigin: (url: string, host: string, port: number) => boolean;
  resolveDataDir: (env?: NodeJS.ProcessEnv, cwd?: string) => string;
  resolveListenHost: (hostname: string | undefined, env?: NodeJS.ProcessEnv) => string;
  spawnServerEnv: (opts: {
    packaged: boolean;
    dataDir: string;
    host: string;
    port: number;
    extra?: NodeJS.ProcessEnv;
  }) => NodeJS.ProcessEnv;
};

describe("desktop listen host and userData", () => {
  it("binds loopback by default and never 0.0.0.0 in the app", () => {
    expect(runtime.LISTEN_HOST).toBe("127.0.0.1");
    expect(runtime.resolveListenHost(undefined)).toBe("127.0.0.1");
    expect(runtime.resolveListenHost("0.0.0.0")).toBe("127.0.0.1");
    expect(runtime.resolveListenHost("::")).toBe("127.0.0.1");
    expect(runtime.resolveListenHost("localhost")).toBe("127.0.0.1");
  });

  it("allows 0.0.0.0 only when COS_HARNESS_BIND_ALL is explicit (Docker)", () => {
    expect(
      runtime.resolveListenHost("0.0.0.0", { COS_HARNESS_BIND_ALL: "1" }),
    ).toBe("0.0.0.0");
  });

  it("stores encrypted settings under the OS userData/data directory", () => {
    expect(runtime.desktopDataDir("/home/user/.config/COS Harness")).toBe(
      "/home/user/.config/COS Harness/data",
    );
    expect(runtime.resolveDataDir({ DATA_DIR: "/var/lib/cos-harness" })).toBe(
      "/var/lib/cos-harness",
    );
  });

  it("spawned Next env forces HOSTNAME=127.0.0.1 even if parent had 0.0.0.0", () => {
    const env = runtime.spawnServerEnv({
      packaged: true,
      dataDir: "/tmp/cos-harness-data",
      host: "127.0.0.1",
      port: 47821,
      extra: { HOSTNAME: "0.0.0.0" },
    });
    expect(env.HOSTNAME).toBe("127.0.0.1");
    expect(env.DATA_DIR).toBe("/tmp/cos-harness-data");
    expect(env.PORT).toBe("47821");
    expect(env.ELECTRON_RUN_AS_NODE).toBe("1");
  });

  it("treats only the local app origin as in-window navigation", () => {
    expect(runtime.isAppOrigin("http://127.0.0.1:47821/settings", "127.0.0.1", 47821)).toBe(
      true,
    );
    expect(
      runtime.isAppOrigin("https://examplebucket-1250000000.cos.ap-guangzhou.myqcloud.com/a.jpg", "127.0.0.1", 47821),
    ).toBe(false);
  });

  it("keeps the historical preferred port for local reuse", () => {
    expect(runtime.PREFERRED_PORT).toBe(47821);
  });
});
