"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useMemo, useRef, useState } from "react";
import { Paperclip, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ToolCard, type ToolPartLike } from "@/components/chat/tool-card";

const examples = [
  "列出我的存储桶",
  "列出默认桶根目录的对象",
  "给 photos/demo.jpg 生成 1 小时签名预览链接",
  "把 photos/demo.jpg 缩放到宽 800 并转成 webp，写到新键",
];

function isToolPart(part: { type: string }): part is ToolPartLike {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

export function ChatView() {
  const [input, setInput] = useState("");
  const [uploadHint, setUploadHint] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const { messages, sendMessage, status, error, stop, addToolApprovalResponse } =
    useChat({
      transport,
      sendAutomaticallyWhen: ({ messages: next }) =>
        lastAssistantMessageIsCompleteWithToolCalls({ messages: next }) ||
        lastAssistantMessageIsCompleteWithApprovalResponses({ messages: next }),
    });

  const busy = status === "submitted" || status === "streaming";

  async function onSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  async function onUpload(file: File) {
    setUploading(true);
    setUploadHint(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await response.json()) as {
        error?: string;
        bucket?: string;
        key?: string;
        bytes?: number;
        filename?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "上传失败");
      }
      setUploadHint(`已上传 ${data.filename} → ${data.bucket}/${data.key}`);
      await sendMessage({
        text: `我刚刚通过网页上传了文件「${data.filename}」到 \`${data.bucket}/${data.key}\`（${data.bytes} 字节）。请确认对象已存在，并告诉我下一步可以做什么。`,
      });
    } catch (err) {
      setUploadHint(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
          {messages.length === 0 && (
            <div className="rounded-xl border border-border/80 bg-card/60 p-6">
              <h1 className="text-lg font-semibold">和 COS 助手对话</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                先在「设置」里填入模型接口和腾讯云凭证，然后让助手列桶、上传、签名下载或做同步图片处理。删除和覆盖原图会弹出确认卡片。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {examples.map((text) => (
                  <button
                    key={text}
                    type="button"
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    onClick={() => {
                      setInput(text);
                    }}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <article
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-8 rounded-xl bg-primary/10 px-4 py-3 text-sm leading-6"
                  : "mr-4 space-y-2 text-sm leading-6"
              }
            >
              <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {message.role === "user" ? "你" : "助手"}
              </div>
              {message.parts.map((part, index) => {
                if (part.type === "text" && part.text) {
                  return (
                    <div
                      key={`${message.id}-text-${index}`}
                      className="whitespace-pre-wrap"
                    >
                      {part.text}
                    </div>
                  );
                }
                if (isToolPart(part)) {
                  return (
                    <ToolCard
                      key={`${message.id}-${part.toolCallId || index}`}
                      part={part}
                      onApprove={(id) =>
                        addToolApprovalResponse({ id, approved: true })
                      }
                      onDeny={(id) =>
                        addToolApprovalResponse({
                          id,
                          approved: false,
                          reason: "用户取消了该操作",
                        })
                      }
                    />
                  );
                }
                return null;
              })}
            </article>
          ))}

          {busy && (
            <p className="text-xs text-muted-foreground">正在思考并调用工具…</p>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border/80 bg-background/80 px-4 py-3 sm:px-6">
        <form
          className="mx-auto flex w-full max-w-3xl flex-col gap-2"
          onSubmit={onSubmit}
        >
          {error && (
            <Alert variant="destructive">
              <AlertTitle>对话出错</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {uploadHint && (
            <p className="text-xs text-muted-foreground">{uploadHint}</p>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onUpload(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={busy || uploading}
              onClick={() => fileRef.current?.click()}
              aria-label="上传文件到 COS"
            >
              <Paperclip />
            </Button>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="例如：列出默认桶里 images/ 下的对象"
              className="min-h-12 flex-1 resize-none"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void onSubmit();
                }
              }}
            />
            {busy ? (
              <Button type="button" variant="outline" onClick={() => void stop()}>
                <Square data-icon="inline-start" />
                停止
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim() || uploading}>
                <Send data-icon="inline-start" />
                发送
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
