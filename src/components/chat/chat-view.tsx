"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SAMPLE_DELETE_CONFIRMATION, ToolCard, type ToolPartLike } from "@/components/chat/tool-card";

function isToolPart(part: { type: string }): part is ToolPartLike {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

export function ChatView({
  compact,
  seedPrompt,
  onSeedConsumed,
  contextHint,
}: {
  compact?: boolean;
  seedPrompt?: string | null;
  onSeedConsumed?: () => void;
  contextHint?: string;
}) {
  const [input, setInput] = useState("");
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const draft = seedPrompt || input;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  async function onSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setInput("");
    onSeedConsumed?.();
    await sendMessage({ text });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={compact ? "flex flex-col gap-3 px-3 py-3" : "mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6"}>
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-4">
                <p className="text-[13px] text-zinc-200">对着当前桶说话</p>
                <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                  列对象、签名、处理图片。删除和覆盖会亮出确认卡，点了才执行。
                </p>
                {contextHint && (
                  <p className="mt-2 font-mono text-[10px] text-zinc-600">{contextHint}</p>
                )}
              </div>
              <p className="px-1 text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
                删除时会出现这张卡 · 示例
              </p>
              <div className="pointer-events-none">
                <ToolCard
                  part={SAMPLE_DELETE_CONFIRMATION}
                  onApprove={() => undefined}
                  onDeny={() => undefined}
                />
              </div>
            </div>
          )}

          {messages.map((message) => (
            <article
              key={message.id}
              className={
                message.role === "user"
                  ? "rounded-xl bg-cyan-400/10 px-3 py-2 text-[13px] leading-6"
                  : "space-y-2 text-[13px] leading-6"
              }
            >
              <div className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
                {message.role === "user" ? "你" : "助手"}
              </div>
              {message.parts.map((part, index) => {
                if (part.type === "text" && part.text) {
                  return (
                    <div key={`${message.id}-text-${index}`} className="whitespace-pre-wrap">
                      {part.text}
                    </div>
                  );
                }
                if (isToolPart(part)) {
                  return (
                    <ToolCard
                      key={`${message.id}-${part.toolCallId || index}`}
                      part={part}
                      onApprove={(id) => addToolApprovalResponse({ id, approved: true })}
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
          {busy && <p className="text-[11px] text-zinc-500">正在调用工具…</p>}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-white/6 px-3 py-3">
        <form className="flex flex-col gap-2" onSubmit={onSubmit}>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>对话出错</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(event) => {
                onSeedConsumed?.();
                setInput(event.target.value);
              }}
              placeholder="问助手，或描述要对当前对象做的事"
              className="min-h-11 flex-1 resize-none border-white/8 bg-black/20"
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
              <Button type="submit" disabled={!draft.trim()}>
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
