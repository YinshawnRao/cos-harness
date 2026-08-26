"use client";

import { AlertTriangle, Check, LoaderCircle, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { summarizeArgs } from "@/lib/redact";

export type ToolPartLike = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: {
    id: string;
    approved?: boolean;
    isAutomatic?: boolean;
    reason?: string;
  };
};

const LABELS: Record<string, string> = {
  list_buckets: "列出存储桶",
  list_objects: "列出对象",
  upload_from_url: "从 URL 上传",
  get_signed_url: "签名 URL",
  delete_object: "删除对象",
  copy_object: "复制/重命名",
  create_prefix: "创建前缀",
  get_image_info: "图片信息",
  process_image: "图片处理",
  watermark_text: "文字水印",
};

function toolNameOf(part: ToolPartLike): string {
  if (part.toolName) return part.toolName;
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return part.type;
}

function summarizeOutput(output: unknown): string {
  if (output == null) return "";
  if (typeof output === "string") return output;
  const record = output as Record<string, unknown>;
  if (record.previewUrl) return `预览 URL 已生成`;
  if (record.deleted) return `已删除 ${record.key}`;
  if (Array.isArray(record) || Array.isArray(record.objects) || Array.isArray(record.Buckets)) {
    const n =
      Array.isArray(record)
        ? record.length
        : Array.isArray(record.objects)
          ? (record.objects as unknown[]).length
          : (record.Buckets as unknown[]).length;
    return `返回 ${n} 条`;
  }
  if (record.key) return String(record.key);
  return summarizeArgs(output, 180);
}

export function ToolCard({
  part,
  onApprove,
  onDeny,
}: {
  part: ToolPartLike;
  onApprove: (approvalId: string) => void;
  onDeny: (approvalId: string) => void;
}) {
  const name = toolNameOf(part);
  const label = LABELS[name] || name;
  const state = part.state || "input-available";
  const pendingApproval =
    state === "approval-requested" && part.approval?.id && !part.approval.isAutomatic;

  return (
    <div className="rounded-xl border border-white/8 bg-black/30 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-100">
        {state === "output-available" ? (
          <Check className="size-3.5 text-cyan-300" />
        ) : state === "output-error" || state === "output-denied" ? (
          <X className="size-3.5 text-red-400" />
        ) : state === "approval-requested" ? (
          <AlertTriangle className="size-3.5 text-amber-300" />
        ) : (
          <LoaderCircle className="size-3.5 animate-spin text-zinc-500" />
        )}
        <Wrench className="size-3.5 text-zinc-500" />
        <span>{label}</span>
        <span className="font-mono text-[10px] text-zinc-500">{name}</span>
      </div>
      {part.input != null && (
        <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-5 text-zinc-500">
          {summarizeArgs(part.input)}
        </pre>
      )}
      {state === "output-available" && (
        <p className="mt-2 text-xs text-zinc-200">{summarizeOutput(part.output)}</p>
      )}
      {state === "output-error" && (
        <p className="mt-2 text-xs text-red-400">{part.errorText}</p>
      )}
      {state === "output-denied" && (
        <p className="mt-2 text-xs text-zinc-500">
          已取消{part.approval?.reason ? `：${part.approval.reason}` : ""}
        </p>
      )}
      {pendingApproval && (
        <div className="confirm-pulse mt-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3">
          <p className="text-[12px] font-medium text-amber-100">需要确认</p>
          <p className="mt-1 text-[11px] leading-5 text-zinc-400">
            破坏性操作，核对对象键后再执行。
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="destructive" onClick={() => onApprove(part.approval!.id)}>
              确认执行
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDeny(part.approval!.id)}>
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export const SAMPLE_DELETE_CONFIRMATION: ToolPartLike = {
  type: "tool-delete_object",
  toolName: "delete_object",
  state: "approval-requested",
  input: { key: "photos/hero.jpg", bucket: "your-bucket-1250000000" },
  approval: { id: "sample-approval", approved: false, isAutomatic: false },
};
