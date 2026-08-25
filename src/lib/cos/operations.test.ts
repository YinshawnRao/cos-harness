import { describe, expect, it, vi } from "vitest";
import { CosOperations, type CosLike } from "./operations";

function mockCos(overrides: Partial<CosLike> = {}): CosLike {
  return {
    getService: vi.fn(),
    getBucket: vi.fn(),
    putObject: vi.fn(),
    deleteObject: vi.fn(),
    putObjectCopy: vi.fn(),
    headObject: vi.fn(),
    getObjectUrl: vi.fn(),
    request: vi.fn(),
    ...overrides,
  } as unknown as CosLike;
}

describe("CosOperations wrapper", () => {
  it("lists objects as prefixes + files without leaking request credentials", async () => {
    const cos = mockCos({
      getBucket: vi.fn().mockResolvedValue({
        Contents: [
          {
            Key: "photos/a.jpg",
            Size: "12",
            LastModified: "2026-01-01T00:00:00Z",
            StorageClass: "STANDARD",
          },
        ],
        CommonPrefixes: [{ Prefix: "photos/raw/" }],
        IsTruncated: "false",
      }),
    });
    const ops = new CosOperations(cos);
    const result = await ops.listObjects({
      bucket: "demo-1250000000",
      region: "ap-guangzhou",
      prefix: "photos/",
    });
    expect(result.objects[0]?.key).toBe("photos/a.jpg");
    expect(result.prefixes[0]?.prefix).toBe("photos/raw/");
    expect(JSON.stringify(result)).not.toMatch(/SecretKey|Authorization/i);
  });

  it("deleteObject calls the SDK once with bucket/key only", async () => {
    const deleteObject = vi.fn().mockResolvedValue({ statusCode: 204 });
    const ops = new CosOperations(mockCos({ deleteObject }));
    const result = await ops.deleteObject({
      bucket: "demo-1250000000",
      region: "ap-guangzhou",
      key: "gone.jpg",
    });
    expect(deleteObject).toHaveBeenCalledWith({
      Bucket: "demo-1250000000",
      Region: "ap-guangzhou",
      Key: "gone.jpg",
    });
    expect(result).toEqual({
      deleted: true,
      bucket: "demo-1250000000",
      key: "gone.jpg",
    });
  });

  it("processImage sends Pic-Operations image_process and a new fileid", async () => {
    const request = vi.fn().mockResolvedValue({ statusCode: 200, UploadResult: { ProcessResults: [] } });
    const ops = new CosOperations(mockCos({ request }));
    await ops.processImage({
      bucket: "demo-1250000000",
      region: "ap-guangzhou",
      key: "a.jpg",
      targetKey: "a.processed.jpg",
      rule: "imageMogr2/thumbnail/800x",
    });
    expect(request).toHaveBeenCalledTimes(1);
    const arg = request.mock.calls[0][0] as {
      Action: string;
      Method: string;
      Headers: { "Pic-Operations": string };
    };
    expect(arg.Action).toBe("image_process");
    expect(arg.Method).toBe("POST");
    const pic = JSON.parse(arg.Headers["Pic-Operations"]) as {
      rules: { fileid: string; rule: string }[];
    };
    expect(pic.rules[0]?.fileid).toBe(encodeURIComponent("a.processed.jpg"));
    expect(pic.rules[0]?.rule).toBe("imageMogr2/thumbnail/800x");
  });
});
