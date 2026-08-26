import { NextResponse } from "next/server";
import { apiError, withCosOps } from "@/lib/cos/with-session";
import { logger } from "@/lib/logger";
import { THUMBNAIL_RULE, isFolderPlaceholder, isImageKey } from "@/lib/studio/files";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get("prefix") || "";
    const marker = url.searchParams.get("marker") || undefined;
    const ctx = await withCosOps();
    const bucket = ctx.bucket(url.searchParams.get("bucket") || undefined);
    const listed = await ctx.operations.listObjects({
      bucket,
      region: ctx.region(),
      prefix,
      delimiter: "/",
      marker,
      maxKeys: 200,
    });

    const objects = listed.objects.filter(
      (item) => !isFolderPlaceholder(item.key, listed.prefix),
    );

    const withThumbs = await Promise.all(
      objects.map(async (item) => {
        if (!isImageKey(item.key)) {
          return { ...item, isImage: false as const };
        }
        try {
          const signed = await ctx.operations.getSignedUrl({
            bucket,
            region: ctx.region(),
            key: item.key,
            expiresIn: 3600,
            queryString: THUMBNAIL_RULE,
          });
          return {
            ...item,
            isImage: true as const,
            thumbnailUrl: signed.url,
          };
        } catch {
          return { ...item, isImage: true as const };
        }
      }),
    );

    return NextResponse.json({
      bucket,
      region: ctx.region(),
      prefix: listed.prefix,
      objects: withThumbs,
      prefixes: listed.prefixes,
      isTruncated: listed.isTruncated,
      nextMarker: listed.nextMarker,
    });
  } catch (error) {
    logger.error("列出对象失败", error);
    return NextResponse.json(apiError(error, "列出对象失败"), { status: 400 });
  }
}
