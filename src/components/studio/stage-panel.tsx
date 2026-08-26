"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  FolderOpen,
  ImageIcon,
  Info,
  Link2,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBytes, formatModified, isImageKey, objectName } from "@/lib/studio/files";
import { useStudio, type ObjectItem, type ProcessResult } from "./studio-context";

export function StagePanel({ onPickFiles }: { onPickFiles: () => void }) {
  const {
    settings,
    objects,
    prefixes,
    selectedKey,
    prefix,
    bucket,
    processResult,
    setProcessResult,
    setAgentOpen,
    setSeedPrompt,
    selectBucket,
    buckets,
    refresh,
  } = useStudio();
  const selected = objects.find((item) => item.key === selectedKey) || null;

  if (!settings?.tencent.secretIdSet) {
    return (
      <HomeFrame>
        <h1 className="font-heading text-3xl tracking-tight text-zinc-50">把 COS 当成工作室</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
          浏览私有桶、处理图片、签发预览链接。密钥留在本机，助手只负责操作，看不到 SecretKey。
        </p>
        <Link
          href="/settings"
          className="mt-8 inline-flex h-10 items-center rounded-full bg-cyan-300 px-5 text-sm font-medium text-zinc-950"
        >
          接入密钥，开始工作
        </Link>
      </HomeFrame>
    );
  }

  if (selected && isImageKey(selected.key)) {
    return (
      <ImageStage
        key={selected.key}
        item={selected}
        bucket={bucket}
        result={processResult}
        onResult={setProcessResult}
        onAsk={(prompt) => {
          setAgentOpen(true);
          setSeedPrompt(prompt);
        }}
      />
    );
  }

  if (selected) {
    return (
      <FileStage
        item={selected}
        bucket={bucket}
        onAsk={(prompt) => {
          setAgentOpen(true);
          setSeedPrompt(prompt);
        }}
      />
    );
  }

  if (prefix || objects.length > 0 || prefixes.length > 0) {
    return (
      <FolderStage
        objects={objects}
        onPickFiles={onPickFiles}
        prefix={prefix}
        bucket={bucket}
      />
    );
  }

  return (
    <HomeFrame>
      <p className="text-[11px] tracking-[0.22em] text-cyan-300/80 uppercase">工作台</p>
      <h1 className="mt-2 font-heading text-3xl tracking-tight text-zinc-50">对象存储 · 数据万象</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
        左侧是资源库。选一张图，中间就是处理台。助手在右侧待命，删除和覆盖仍要你点确认。
      </p>
      <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
        <ActionTile
          icon={FolderOpen}
          title="浏览存储桶"
          copy="切换桶与前缀，像翻本地相册。"
          onClick={() => {
            const first = buckets[0]?.name;
            if (first) selectBucket(first);
            void refresh();
          }}
        />
        <ActionTile
          icon={Upload}
          title="上传"
          copy="拖到库或工作台，直接写入当前前缀。"
          onClick={onPickFiles}
        />
        <ActionTile
          icon={Wand2}
          title="图片处理"
          copy="缩略图、转 webp、水印。默认写新键。"
          onClick={() => {
            setAgentOpen(true);
            setSeedPrompt("把当前桶里的一张图缩放到宽 800 并转成 webp，写到新键。");
          }}
        />
        <ActionTile
          icon={Link2}
          title="签名链接"
          copy="私有对象的限时预览，不把桶公开。"
          onClick={() => {
            setAgentOpen(true);
            setSeedPrompt("给当前前缀下最近的一张图片生成 1 小时签名预览链接。");
          }}
        />
      </div>
    </HomeFrame>
  );
}

function HomeFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio-grid relative flex h-full min-h-0 flex-col overflow-y-auto px-8 py-10">
      <div className="pointer-events-none absolute inset-x-12 top-8 h-40 rounded-full bg-cyan-400/8 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}

function ActionTile({
  icon: Icon,
  title,
  copy,
  onClick,
}: {
  icon: typeof Upload;
  title: string;
  copy: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-white/8 bg-white/3 p-5 text-left transition-colors hover:border-cyan-400/25 hover:bg-cyan-400/6"
    >
      <Icon className="size-5 text-cyan-300" />
      <div className="mt-4 text-[15px] font-medium text-zinc-50">{title}</div>
      <p className="mt-1 text-[12px] leading-6 text-zinc-500">{copy}</p>
    </button>
  );
}

function FolderStage({
  objects,
  prefix,
  bucket,
  onPickFiles,
}: {
  objects: ObjectItem[];
  prefix: string;
  bucket: string;
  onPickFiles: () => void;
}) {
  const { selectObject } = useStudio();
  const images = objects.filter((item) => item.isImage);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-end justify-between px-6 py-4">
        <div>
          <div className="text-[11px] tracking-[0.18em] text-zinc-500 uppercase">目录</div>
          <h2 className="mt-1 text-lg text-zinc-50">{prefix || "根目录"}</h2>
          <p className="text-[12px] text-zinc-500">
            {bucket} · {objects.length} 个对象
          </p>
        </div>
        <Button variant="outline" onClick={onPickFiles}>
          <Upload data-icon="inline-start" />
          上传到这里
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => selectObject(item.key)}
                style={{ animationDelay: `${index * 30}ms` }}
                className="studio-stagger overflow-hidden rounded-xl border border-white/8 bg-black/20 text-left hover:border-cyan-400/30"
              >
                <div className="aspect-square bg-zinc-900">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnailUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center">
                      <ImageIcon className="size-8 text-zinc-600" />
                    </div>
                  )}
                </div>
                <div className="truncate px-3 py-2 text-[11px] text-zinc-300">
                  {objectName(item.key)}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-16 text-sm text-zinc-500">没有图片。把文件拖到这里，或点上传。</p>
        )}
      </div>
    </div>
  );
}

function FileStage({
  item,
  bucket,
  onAsk,
}: {
  item: ObjectItem;
  bucket: string;
  onAsk: (prompt: string) => void;
}) {
  return (
    <div className="px-8 py-10">
      <div className="text-[11px] tracking-[0.18em] text-zinc-500 uppercase">对象</div>
      <h2 className="mt-2 text-2xl text-zinc-50">{objectName(item.key)}</h2>
      <p className="mt-2 font-mono text-[12px] text-zinc-500">{item.key}</p>
      <p className="mt-1 text-[12px] text-zinc-500">
        {formatBytes(item.size)}
        {item.lastModified ? ` · ${formatModified(item.lastModified)}` : ""} · {bucket}
      </p>
      <div className="mt-6 flex gap-2">
        <Button
          variant="outline"
          onClick={() => onAsk(`给 \`${item.key}\` 生成 1 小时签名预览链接`)}
        >
          签名链接
        </Button>
      </div>
    </div>
  );
}

function ImageStage({
  item,
  bucket,
  result,
  onResult,
  onAsk,
}: {
  item: ObjectItem;
  bucket: string;
  result: ProcessResult | null;
  onResult: (result: ProcessResult | null) => void;
  onAsk: (prompt: string) => void;
}) {
  const { selectObject, refresh } = useStudio();
  const [preview, setPreview] = useState<string | null>(item.thumbnailUrl || null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watermark, setWatermark] = useState("COS Harness");
  const [signed, setSigned] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/cos/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: item.key,
          bucket,
          queryString: "imageMogr2/thumbnail/1600x",
        }),
      });
      const data = await response.json();
      if (!cancelled && response.ok) setPreview(data.url);
    })();
    return () => {
      cancelled = true;
    };
  }, [item.key, bucket]);

  async function run(action: "thumbnail" | "webp" | "watermark" | "preview", text?: string) {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch("/api/cos/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, bucket, action, text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "处理失败");
      onResult({
        originalUrl: data.originalUrl,
        processedUrl: data.processedUrl,
        targetKey: data.targetKey,
        sourceKey: data.sourceKey || item.key,
        mode: data.mode,
        rule: data.rule,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "处理失败");
    } finally {
      setBusy(null);
    }
  }

  async function loadInfo() {
    setBusy("info");
    setError(null);
    try {
      const response = await fetch(
        `/api/cos/image-info?key=${encodeURIComponent(item.key)}&bucket=${encodeURIComponent(bucket)}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "读取失败");
      setInfo(JSON.stringify(data.body ?? data, null, 2).slice(0, 1200));
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取失败");
    } finally {
      setBusy(null);
    }
  }

  async function sign() {
    setBusy("sign");
    setError(null);
    try {
      const response = await fetch("/api/cos/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, bucket, expiresIn: 3600 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "签名失败");
      setSigned(data.url);
      await navigator.clipboard.writeText(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "签名失败");
    } finally {
      setBusy(null);
    }
  }

  const before = result?.originalUrl || preview;
  const after = result?.processedUrl;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <div className="text-[11px] tracking-[0.18em] text-cyan-300/80 uppercase">图片台</div>
          <h2 className="mt-1 truncate text-lg text-zinc-50">{objectName(item.key)}</h2>
          <p className="font-mono text-[11px] text-zinc-500">{item.key}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <CiButton busy={busy === "thumbnail"} onClick={() => void run("thumbnail")}>
            缩略图
          </CiButton>
          <CiButton busy={busy === "webp"} onClick={() => void run("webp")}>
            转 webp
          </CiButton>
          <CiButton busy={busy === "watermark"} onClick={() => void run("watermark", watermark)}>
            加水印
          </CiButton>
          <CiButton busy={busy === "info"} onClick={() => void loadInfo()}>
            <Info className="size-3.5" />
            图片信息
          </CiButton>
          <CiButton busy={busy === "sign"} onClick={() => void sign()}>
            <Link2 className="size-3.5" />
            签名链接
          </CiButton>
          <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
            删除
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-6 pb-3">
        <input
          value={watermark}
          onChange={(event) => setWatermark(event.target.value)}
          className="h-8 max-w-56 rounded-lg border border-white/8 bg-black/20 px-2 text-[12px] outline-none focus:border-cyan-400/40"
          placeholder="水印文字"
        />
        <span className="text-[11px] text-zinc-500">处理默认写新键，不覆盖原图</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
        <div className={after ? "grid gap-3 md:grid-cols-2" : "grid"}>
          <PreviewCard label="原图" src={before} fadeKey={item.key} />
          {after && (
            <PreviewCard label="处理后" src={after} fadeKey={result?.targetKey || after} accent />
          )}
        </div>
        {result?.targetKey && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/6 px-3 py-2 text-[12px]">
            <span className="text-zinc-400">新键</span>
            <code className="font-mono text-cyan-100">{result.targetKey}</code>
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1 text-cyan-200 hover:text-white"
              onClick={() => void navigator.clipboard.writeText(result.targetKey || "")}
            >
              <Copy className="size-3.5" />
              复制
            </button>
            {result.processedUrl && (
              <a
                href={result.processedUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-cyan-200 hover:text-white"
              >
                <ExternalLink className="size-3.5" />
                打开
              </a>
            )}
          </div>
        )}
        {signed && (
          <p className="mt-3 truncate text-[11px] text-zinc-400">已复制签名链接：{signed}</p>
        )}
        {info && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-xl border border-white/8 bg-black/30 p-3 text-[11px] leading-5 text-zinc-400">
            {info}
          </pre>
        )}
        {error && <p className="mt-3 text-[12px] text-red-400">{error}</p>}
        <button
          type="button"
          onClick={() =>
            onAsk(`看一下 \`${item.key}\` 的图片信息，必要时生成签名预览。`)
          }
          className="mt-6 inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-cyan-200"
        >
          <Sparkles className="size-3.5" />
          让助手继续处理
        </button>
      </div>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="confirm-pulse border-amber-500/30 bg-[#12151c]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              将永久删除 <code className="font-mono text-zinc-200">{item.key}</code>
              。此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void (async () => {
                  const response = await fetch("/api/cos/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: item.key, bucket, confirmed: true }),
                  });
                  const data = await response.json();
                  if (!response.ok) {
                    setError(data.error || "删除失败");
                    setConfirmDelete(false);
                    return;
                  }
                  setConfirmDelete(false);
                  selectObject(null);
                  await refresh();
                })();
              }}
            >
              确认执行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PreviewCard({
  label,
  src,
  fadeKey,
  accent,
}: {
  label: string;
  src: string | null;
  fadeKey: string;
  accent?: boolean;
}) {
  const loaded = useRef(fadeKey);
  return (
    <figure
      className={
        accent
          ? "overflow-hidden rounded-2xl border border-cyan-400/20 bg-black/30"
          : "overflow-hidden rounded-2xl border border-white/8 bg-black/30"
      }
    >
      <figcaption className="px-3 py-2 text-[11px] tracking-wide text-zinc-500">{label}</figcaption>
      <div className="grid aspect-[4/3] place-items-center bg-[#08090c]">
        {src ? (
          // COS signed URL hosts vary; next/image remotePatterns cannot cover them.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={fadeKey}
            src={src}
            alt={label}
            className="studio-fade max-h-full max-w-full object-contain"
            onLoad={() => {
              loaded.current = fadeKey;
            }}
          />
        ) : (
          <ImageIcon className="size-10 text-zinc-700" />
        )}
      </div>
    </figure>
  );
}

function CiButton({
  children,
  onClick,
  busy,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={onClick}>
      {busy ? "处理中…" : children}
    </Button>
  );
}
