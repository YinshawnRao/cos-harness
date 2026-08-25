import { describe, expect, it } from "vitest";
import {
  buildImageProcessRule,
  buildTextWatermarkRule,
  defaultProcessedKey,
  isOverwriteTarget,
  urlSafeBase64,
} from "./rules";

describe("CI rule builder", () => {
  it("builds documented imageMogr2 thumbnail/format/quality rules", () => {
    expect(buildImageProcessRule({ width: 800 })).toBe("imageMogr2/thumbnail/800x");
    expect(buildImageProcessRule({ percent: 50, format: "webp", quality: 80 })).toBe(
      "imageMogr2/thumbnail/!50p/format/webp/quality/80",
    );
    expect(
      buildImageProcessRule({
        crop: { width: 100, height: 80, x: 10, y: 20 },
      }),
    ).toBe("imageMogr2/cut/100x80x10x20");
  });

  it("builds documented watermark/2 text rules with url-safe base64", () => {
    const rule = buildTextWatermarkRule({ text: "hello", fontSize: 24, fill: "#FF0000" });
    expect(rule.startsWith("watermark/2/text/")).toBe(true);
    expect(rule).toContain(`text/${urlSafeBase64("hello")}`);
    expect(rule).toContain(`fill/${urlSafeBase64("#FF0000")}`);
    expect(rule).toContain("fontsize/24");
    expect(rule).not.toMatch(/\+/);
  });

  it("writes to a new key by default and detects overwrite", () => {
    const next = defaultProcessedKey("folder/pic.jpg");
    expect(next).toMatch(/^folder\/pic\.processed\./);
    expect(next).not.toBe("folder/pic.jpg");
    expect(isOverwriteTarget("a.jpg", "a.jpg")).toBe(true);
    expect(isOverwriteTarget("a.jpg", "b.jpg")).toBe(false);
    expect(isOverwriteTarget("a.jpg", undefined, "overwrite")).toBe(true);
  });
});
