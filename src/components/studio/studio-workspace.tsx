"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LibraryPanel, LibraryResizeHandle } from "./library-panel";
import { StagePanel } from "./stage-panel";
import { AgentDrawer } from "./agent-drawer";
import { useStudio } from "./studio-context";

export function StudioWorkspace() {
  const { libraryWidth, setLibraryWidth, prefix, bucket, refresh, loadSettings } = useStudio();
  const [dragOver, setDragOver] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadSettings().then((latest) => refresh(undefined, latest));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setHint("正在上传…");
      try {
        for (const file of list) {
          const form = new FormData();
          form.set("file", file);
          if (bucket) form.set("bucket", bucket);
          if (prefix) form.set("prefix", prefix);
          const response = await fetch("/api/upload", { method: "POST", body: form });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "上传失败");
          setHint(`已上传 ${data.filename} → ${data.key}`);
        }
        await refresh();
      } catch (error) {
        setHint(error instanceof Error ? error.message : "上传失败");
      }
    },
    [bucket, prefix, refresh],
  );

  return (
    <div
      className="flex min-h-0 flex-1"
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        if (event.dataTransfer.files?.length) void uploadFiles(event.dataTransfer.files);
      }}
    >
      <div style={{ width: libraryWidth }} className="flex shrink-0 flex-col border-r border-white/6 bg-[#0a0d12]/80">
        <LibraryPanel />
      </div>
      <LibraryResizeHandle width={libraryWidth} onWidth={setLibraryWidth} />
      <section className="relative flex min-w-0 flex-1 flex-col">
        <StagePanel onPickFiles={() => fileRef.current?.click()} />
        {hint && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[11px] text-zinc-200">
            {hint}
          </div>
        )}
        {dragOver && (
          <div className="absolute inset-3 grid place-items-center rounded-2xl border border-dashed border-cyan-400/40 bg-cyan-400/8 text-sm text-cyan-100">
            放到当前前缀
          </div>
        )}
      </section>
      <AgentDrawer />
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        multiple
        onChange={(event) => {
          if (event.target.files) void uploadFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
