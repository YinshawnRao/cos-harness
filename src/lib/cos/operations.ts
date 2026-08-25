import type COS from "cos-nodejs-sdk-v5";
import { formatCosError, ToolError } from "./errors";

export type CosLike = Pick<
  COS,
  | "getService"
  | "getBucket"
  | "putObject"
  | "deleteObject"
  | "putObjectCopy"
  | "headObject"
  | "getObjectUrl"
  | "request"
>;

export type ListedObject = {
  key: string;
  size: number;
  lastModified?: string;
  storageClass?: string;
};

export type ListedPrefix = {
  prefix: string;
};

export type ListObjectsResult = {
  bucket: string;
  prefix: string;
  objects: ListedObject[];
  prefixes: ListedPrefix[];
  isTruncated: boolean;
  nextMarker?: string;
};

export type SignedUrlResult = {
  url: string;
  expiresIn: number;
};

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export class CosOperations {
  constructor(private readonly cos: CosLike) {}

  async listBuckets(region?: string) {
    try {
      const data = await this.cos.getService(region ? { Region: region } : {});
      return (data.Buckets || []).map((bucket) => ({
        name: bucket.Name,
        location: bucket.Location,
        creationDate: bucket.CreationDate,
      }));
    } catch (error) {
      throw new ToolError(formatCosError(error));
    }
  }

  async listObjects(params: {
    bucket: string;
    region: string;
    prefix?: string;
    delimiter?: string;
    marker?: string;
    maxKeys?: number;
  }): Promise<ListObjectsResult> {
    try {
      const data = await this.cos.getBucket({
        Bucket: params.bucket,
        Region: params.region,
        Prefix: params.prefix || "",
        Delimiter: params.delimiter ?? "/",
        Marker: params.marker,
        MaxKeys: Math.min(params.maxKeys ?? 100, 1000),
      });
      return {
        bucket: params.bucket,
        prefix: params.prefix || "",
        objects: (data.Contents || []).map((item) => ({
          key: item.Key,
          size: asNumber(item.Size),
          lastModified: item.LastModified,
          storageClass: item.StorageClass,
        })),
        prefixes: (data.CommonPrefixes || []).map((item) => ({
          prefix: item.Prefix,
        })),
        isTruncated: String(data.IsTruncated) === "true",
        nextMarker: data.NextMarker,
      };
    } catch (error) {
      throw new ToolError(formatCosError(error));
    }
  }

  async uploadObject(params: {
    bucket: string;
    region: string;
    key: string;
    body: Buffer | string;
    contentType?: string;
  }) {
    try {
      const data = await this.cos.putObject({
        Bucket: params.bucket,
        Region: params.region,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      });
      return {
        bucket: params.bucket,
        key: params.key,
        etag: data.ETag,
        location: data.Location,
      };
    } catch (error) {
      throw new ToolError(formatCosError(error));
    }
  }

  async deleteObject(params: { bucket: string; region: string; key: string }) {
    try {
      await this.cos.deleteObject({
        Bucket: params.bucket,
        Region: params.region,
        Key: params.key,
      });
      return { deleted: true, bucket: params.bucket, key: params.key };
    } catch (error) {
      throw new ToolError(formatCosError(error));
    }
  }

  async copyObject(params: {
    bucket: string;
    region: string;
    sourceKey: string;
    targetKey: string;
  }) {
    try {
      const copySource = `${params.bucket}.cos.${params.region}.myqcloud.com/${encodeURIComponent(params.sourceKey).replace(/%2F/g, "/")}`;
      const data = await this.cos.putObjectCopy({
        Bucket: params.bucket,
        Region: params.region,
        Key: params.targetKey,
        CopySource: copySource,
      });
      return {
        bucket: params.bucket,
        sourceKey: params.sourceKey,
        targetKey: params.targetKey,
        etag: data.ETag,
      };
    } catch (error) {
      throw new ToolError(formatCosError(error));
    }
  }

  async objectExists(params: {
    bucket: string;
    region: string;
    key: string;
  }): Promise<boolean> {
    try {
      await this.cos.headObject({
        Bucket: params.bucket,
        Region: params.region,
        Key: params.key,
      });
      return true;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404) return false;
      throw new ToolError(formatCosError(error));
    }
  }

  async getSignedUrl(params: {
    bucket: string;
    region: string;
    key: string;
    expiresIn?: number;
    queryString?: string;
  }): Promise<SignedUrlResult> {
    const expiresIn = params.expiresIn ?? 3600;
    try {
      const data = await new Promise<{ Url: string }>((resolve, reject) => {
        this.cos.getObjectUrl(
          {
            Bucket: params.bucket,
            Region: params.region,
            Key: params.key,
            Sign: true,
            Expires: expiresIn,
            Method: "GET",
            QueryString: params.queryString,
          },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          },
        );
      });
      return { url: data.Url, expiresIn };
    } catch (error) {
      throw new ToolError(formatCosError(error));
    }
  }

  async getImageInfo(params: { bucket: string; region: string; key: string }) {
    try {
      const data = await this.cos.request({
        Bucket: params.bucket,
        Region: params.region,
        Key: params.key,
        Method: "GET",
        Action: "imageInfo",
        RawBody: false,
      });
      return sanitizeImageInfo(data);
    } catch (error) {
      throw new ToolError(formatCosError(error));
    }
  }

  async processImage(params: {
    bucket: string;
    region: string;
    key: string;
    targetKey: string;
    rule: string;
  }) {
    try {
      const picOperations = JSON.stringify({
        is_pic_info: 1,
        rules: [
          {
            fileid: encodeURIComponent(params.targetKey),
            rule: params.rule,
          },
        ],
      });
      const data = await this.cos.request({
        Bucket: params.bucket,
        Region: params.region,
        Key: params.key,
        Method: "POST",
        Action: "image_process",
        Headers: {
          "Pic-Operations": picOperations,
        },
      });
      return {
        bucket: params.bucket,
        sourceKey: params.key,
        targetKey: params.targetKey,
        rule: params.rule,
        processResult: sanitizeImageInfo(data),
      };
    } catch (error) {
      throw new ToolError(formatCosError(error));
    }
  }
}

function sanitizeImageInfo(data: Record<string, unknown>) {
  const headers = data.headers as Record<string, unknown> | undefined;
  return {
    statusCode: data.statusCode,
    body: data.UploadResult ?? data.Body ?? data.Response ?? data,
    contentType: headers?.["content-type"] ?? headers?.["Content-Type"],
  };
}
