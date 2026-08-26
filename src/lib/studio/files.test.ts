import { describe, expect, it } from "vitest";
import { defaultProcessedKey } from "../ci/rules";
import {
  THUMBNAIL_RULE,
  formatBytes,
  isCiProcessableKey,
  isFolderPlaceholder,
  isImageKey,
  objectName,
  parentPrefix,
  prefixLabel,
} from "./files";

describe("studio file helpers", () => {
  it("detects image keys for thumbnails and CI", () => {
    expect(isImageKey("photos/a.JPG")).toBe(true);
    expect(isImageKey("docs/readme.md")).toBe(false);
    expect(isCiProcessableKey("a.webp")).toBe(true);
    expect(isCiProcessableKey("a.gif")).toBe(false);
  });

  it("uses documented imageMogr2 thumbnail rule", () => {
    expect(THUMBNAIL_RULE).toBe("imageMogr2/thumbnail/240x");
  });

  it("derives names and parent prefixes", () => {
    expect(objectName("photos/raw/demo.jpg")).toBe("demo.jpg");
    expect(parentPrefix("photos/raw/demo.jpg")).toBe("photos/raw/");
    expect(prefixLabel("photos/raw/")).toBe("raw");
  });

  it("formats sizes and skips folder placeholders", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(isFolderPlaceholder("photos/", "photos/")).toBe(true);
    expect(isFolderPlaceholder("photos/a.jpg", "photos/")).toBe(false);
  });

  it("process helpers write a new key suffix instead of overwriting", () => {
    expect(defaultProcessedKey("photos/a.jpg", "webp")).not.toBe("photos/a.jpg");
    expect(defaultProcessedKey("photos/a.jpg", "webp")).toContain("webp");
  });
});
