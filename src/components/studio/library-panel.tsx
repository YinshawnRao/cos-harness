"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  File,
  Folder,
  HardDrive,
  ImageIcon,
  Search,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes, formatModified, objectName, prefixLabel } from "@/lib/studio/files";
import { useStudio } from "./studio-context";

export function LibraryPanel() {
  const {
    buckets,
    bucket,
    prefix,
    prefixes,
    objects,
    selectedKey,
    loadingList,
    listError,
    selectBucket,
    openPrefix,
    selectObject,
    settings,
  } = useStudio();
  const [query, setQuery] = useState("");
  const crumbs = useMemo(() => breadcrumb(prefix), [prefix]);
  const visibleObjects = objects.filter((item) =>
    objectName(item.key).toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/6 px-3 py-3">
        <div className="text-[11px] font-medium tracking-[0.18em] text-zinc-500 uppercase">
          资源
        </div>
        <label className="mt-2 block">
          <span className="sr-only">存储桶</span>
          <select
            value={bucket}
            onChange={(event) => selectBucket(event.target.value)}
            className="h-8 w-full rounded-lg border border-white/8 bg-white/4 px-2 text-[12px] text-zinc-100 outline-none focus:border-cyan-400/40"
          >
            {!bucket && <option value="">选择存储桶</option>}
            {buckets.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute top-2 left-2 size-3.5 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="筛选对象名"
            className="h-8 w-full rounded-lg border border-white/8 bg-black/20 pr-2 pl-7 text-[12px] outline-none placeholder:text-zinc-600 focus:border-cyan-400/40"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap gap-1 px-3 py-2">
          <button
            type="button"
            onClick={() => openPrefix("")}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px]",
              prefix === "" ? "bg-cyan-400/15 text-cyan-200" : "text-zinc-500 hover:text-zinc-200",
            )}
          >
            根目录
          </button>
          {crumbs.map((crumb) => (
            <span key={crumb.prefix} className="flex items-center gap-1">
              <ChevronRight className="size-3 text-zinc-600" />
              <button
                type="button"
                onClick={() => openPrefix(crumb.prefix)}
                className="rounded-full px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-100"
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {!settings?.tencent.secretIdSet && (
            <EmptyNote text="先到设置里接入腾讯云，资源库才会亮起来。" />
          )}
          {listError && <EmptyNote text={listError} />}
          {loadingList && <EmptyNote text="正在读取对象…" />}
          {!loadingList && !listError && settings?.tencent.secretIdSet && (
            <ul className="space-y-0.5">
              {prefixes.map((item, index) => (
                <li
                  key={item.prefix}
                  style={{ animationDelay: `${index * 18}ms` }}
                  className="studio-stagger"
                >
                  <button
                    type="button"
                    onClick={() => openPrefix(item.prefix)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/4"
                  >
                    <Folder className="size-4 text-cyan-300/80" />
                    <span className="min-w-0 flex-1 truncate text-[12px]">
                      {prefixLabel(item.prefix)}
                    </span>
                  </button>
                </li>
              ))}
              {visibleObjects.map((item, index) => (
                <li
                  key={item.key}
                  style={{ animationDelay: `${(prefixes.length + index) * 18}ms` }}
                  className="studio-stagger"
                >
                  <button
                    type="button"
                    onClick={() => selectObject(item.key)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/4",
                      selectedKey === item.key && "bg-cyan-400/10 ring-1 ring-cyan-400/20",
                    )}
                  >
                    <Thumb item={item} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] text-zinc-100">
                        {objectName(item.key)}
                      </span>
                      <span className="block text-[10px] text-zinc-500">
                        {formatBytes(item.size)}
                        {item.lastModified ? ` · ${formatModified(item.lastModified)}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {prefixes.length === 0 && visibleObjects.length === 0 && (
                <EmptyNote text="这个前缀是空的。把文件拖进来，或让助手去别处看看。" />
              )}
            </ul>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-white/6 px-3 py-2 text-[10px] text-zinc-500">
        <HardDrive className="size-3" />
        {bucket || "未选桶"}
        <Upload className="ml-auto size-3" />
        拖入即可上传
      </div>
    </div>
  );
}

function Thumb({ item }: { item: { isImage: boolean; thumbnailUrl?: string; key: string } }) {
  const [failed, setFailed] = useState(false);
  if (item.isImage && item.thumbnailUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.thumbnailUrl}
        alt=""
        onError={() => setFailed(true)}
        className="size-8 rounded-md object-cover ring-1 ring-white/10"
      />
    );
  }
  return item.isImage ? (
    <ImageIcon className="size-4 text-cyan-300/70" />
  ) : (
    <File className="size-4 text-zinc-500" />
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="px-2 py-6 text-[12px] leading-6 text-zinc-500">{text}</p>;
}

function breadcrumb(prefix: string) {
  const parts = prefix.split("/").filter(Boolean);
  return parts.map((_, index) => {
    const value = `${parts.slice(0, index + 1).join("/")}/`;
    return { prefix: value, label: parts[index] };
  });
}

export function LibraryResizeHandle({
  width,
  onWidth,
}: {
  width: number;
  onWidth: (width: number) => void;
}) {
  const dragging = useRef(false);
  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragging.current) return;
      onWidth(Math.min(460, Math.max(240, event.clientX)));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onWidth]);
  return (
    <button
      type="button"
      aria-label="调整资源栏宽度"
      onMouseDown={() => {
        dragging.current = true;
      }}
      className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-cyan-400/30"
      data-width={width}
    />
  );
}
