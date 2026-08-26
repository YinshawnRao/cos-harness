"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Sparkles, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudio } from "./studio-context";

function subscribeDesktop() {
  return () => undefined;
}

function getDesktop() {
  return window.cosHarness ?? null;
}

export function Titlebar() {
  const pathname = usePathname();
  const { settings, bucket, agentOpen, setAgentOpen } = useStudio();
  const desktop = useSyncExternalStore(subscribeDesktop, getDesktop, () => null);
  const isMac = desktop?.platform === "darwin";
  const controls = desktop?.windowControls;

  return (
    <header className="titlebar relative z-20 flex h-11 shrink-0 items-center border-b border-white/6 bg-[#0b0e12]/90 pr-2">
      <div className={cn("flex items-center gap-2 pl-3", isMac ? "pl-20" : "pl-3")}>
        {!isMac && (
          <div className="traffic-lights mr-1 flex items-center gap-1.5">
            <button
              type="button"
              className="size-3 rounded-full bg-[#ff5f57] hover:brightness-110"
              onClick={() => controls?.close()}
              aria-label="关闭"
            />
            <button
              type="button"
              className="size-3 rounded-full bg-[#febc2e] hover:brightness-110"
              onClick={() => controls?.minimize()}
              aria-label="最小化"
            />
            <button
              type="button"
              className="size-3 rounded-full bg-[#28c840] hover:brightness-110"
              onClick={() => controls?.maximize()}
              aria-label="最大化"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-cyan-400/15 text-[11px] font-semibold tracking-wide text-cyan-300">
            COS
          </span>
          <span className="text-[13px] font-medium tracking-wide text-zinc-100">Harness</span>
        </div>
      </div>

      <nav className="titlebar-no-drag ml-6 flex items-center gap-1">
        <NavLink href="/" active={pathname === "/"}>
          工作台
        </NavLink>
        <NavLink href="/settings" active={pathname.startsWith("/settings")}>
          设置
        </NavLink>
      </nav>

      <div className="titlebar-no-drag ml-auto flex items-center gap-2">
        <StatusPill label={settings?.tencent.region || "未设地域"} />
        <StatusPill label={bucket || settings?.tencent.bucket || "未选桶"} />
        <StatusPill label={settings?.llm.model || "未设模型"} />
        {pathname === "/" && (
          <button
            type="button"
            onClick={() => setAgentOpen(!agentOpen)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors",
              agentOpen
                ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                : "border-white/8 bg-white/3 text-zinc-400 hover:text-zinc-200",
            )}
          >
            <Sparkles className="size-3" />
            助手
          </button>
        )}
        {pathname !== "/settings" && (
          <Link
            href="/settings"
            className="inline-flex size-7 items-center justify-center rounded-full text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
            aria-label="设置"
          >
            <Settings2 className="size-3.5" />
          </Link>
        )}
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1 text-[12px] transition-colors",
        active ? "bg-white/8 text-zinc-100" : "text-zinc-500 hover:text-zinc-200",
      )}
    >
      {children}
    </Link>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="hidden max-w-40 truncate rounded-full border border-white/8 bg-white/3 px-2.5 py-0.5 font-mono text-[10px] text-zinc-400 lg:inline">
      {label}
    </span>
  );
}

