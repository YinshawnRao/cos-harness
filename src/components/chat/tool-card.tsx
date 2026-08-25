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
    <div className="rounded-lg border border-border/80 bg-card/80 p-3">
      <div className="flex items-center gap-2 text-xs font-medium">
        {state === "output-available" ? (
          <Check className="size-3.5 text-primary" />
        ) : state === "output-error" || state === "output-denied" ? (
          <X className="size-3.5 text-destructive" />
        ) : state === "approval-requested" ? (
          <AlertTriangle className="size-3.5 text-amber-400" />
        ) : (
          <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" />
        )}
        <Wrench className="size-3.5 text-muted-foreground" />
        <span>{label}</span>
        <span className="font-mono text-[11px] text-muted-foreground">{name}</span>
      </div>
      {part.input != null && (
        <pre className="mt-2 overflow-x-auto text-[11px] leading-5 text-muted-foreground">
          {summarizeArgs(part.input)}
        </pre>
      )}
      {state === "output-available" && (
        <p className="mt-2 text-xs text-foreground/90">{summarizeOutput(part.output)}</p>
      )}
      {state === "output-error" && (
        <p className="mt-2 text-xs text-destructive">{part.errorText}</p>
      )}
      {state === "output-denied" && (
        <p className="mt-2 text-xs text-muted-foreground">
          已取消{part.approval?.reason ? `：${part.approval.reason}` : ""}
        </p>
      )}
      {pendingApproval && (
        <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-xs leading-5">
            这是破坏性操作，确认后才会真正执行。请核对对象键。
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => onApprove(part.approval!.id)}>
              确认执行
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDeny(part.approval!.id)}
            >
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
