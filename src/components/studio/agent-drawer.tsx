"use client";

import { ChatView } from "@/components/chat/chat-view";
import { useStudio } from "./studio-context";

export function AgentDrawer() {
  const { agentOpen, seedPrompt, setSeedPrompt, bucket, prefix, selectedKey } = useStudio();
  if (!agentOpen) return null;
  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-white/6 bg-[#0c1016]/90">
      <div className="border-b border-white/6 px-4 py-3">
        <div className="text-[11px] font-medium tracking-[0.18em] text-cyan-300/80 uppercase">
          助手
        </div>
        <p className="mt-1 text-[11px] leading-5 text-zinc-500">
          对着资源库说话。删除与覆盖会弹出确认。
        </p>
      </div>
      <ChatView
        compact
        seedPrompt={seedPrompt}
        onSeedConsumed={() => setSeedPrompt(null)}
        contextHint={[bucket && `桶 ${bucket}`, prefix && `前缀 ${prefix}`, selectedKey && `对象 ${selectedKey}`]
          .filter(Boolean)
          .join(" · ")}
      />
    </aside>
  );
}
