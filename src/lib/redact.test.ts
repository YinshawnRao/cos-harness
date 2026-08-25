import { describe, expect, it } from "vitest";
import { maskSecret, redactDeep, summarizeArgs } from "./redact";
import { logger } from "./logger";

describe("secret redaction", () => {
  it("masks short and long secrets", () => {
    expect(maskSecret("abcd")).toBe("••••");
    expect(maskSecret("AKIDabcdefghijklmnop")).toMatch(/^AKID••••/);
  });

  it("never leaves SecretKey or apiKey in logged objects", () => {
    const redacted = redactDeep({
      SecretKey: "super-secret-key-value",
      apiKey: "sk-live-abcdefghijklmnopqrstuvwxyz",
      bucket: "demo-1250000000",
    });
    expect(JSON.stringify(redacted)).not.toContain("super-secret-key-value");
    expect(JSON.stringify(redacted)).not.toContain("sk-live-abcdefghijklmnopqrstuvwxyz");
    expect(redacted.bucket).toBe("demo-1250000000");
  });

  it("keeps tool arg summaries free of raw keys", () => {
    const summary = summarizeArgs({
      key: "a.jpg",
      SecretKey: "do-not-log-this",
      sessionToken: "tok-1234567890",
    });
    expect(summary).not.toContain("do-not-log-this");
    expect(summary).not.toContain("tok-1234567890");
    expect(summary).toContain("a.jpg");
  });

  it("logger.info does not print SecretKey", () => {
    const lines: string[] = [];
    const original = console.info;
    console.info = (...args: unknown[]) => {
      lines.push(args.map((item) => JSON.stringify(item)).join(" "));
    };
    try {
      logger.info("cos call", { SecretKey: "abc-secret-xyz-9999", Key: "n.jpg" });
    } finally {
      console.info = original;
    }
    const joined = lines.join("\n");
    expect(joined).not.toContain("abc-secret-xyz-9999");
    expect(joined).toContain("n.jpg");
  });
});
