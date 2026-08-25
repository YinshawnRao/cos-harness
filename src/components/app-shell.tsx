"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "对话", icon: MessageSquare },
  { href: "/settings", label: "设置", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-56 shrink-0 border-r border-border/80 bg-sidebar md:flex md:flex-col">
        <div className="px-4 py-5">
          <div className="text-sm font-semibold tracking-wide text-primary">
            COS Harness
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            对象存储 · 数据万象
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="px-4 py-4 text-[11px] leading-5 text-muted-foreground">
          单用户本地工具。密钥只保存在本机。
        </p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/80 px-4 py-3 md:hidden">
          <span className="text-sm font-semibold text-primary">COS Harness</span>
          <div className="flex gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2 py-1 text-sm",
                  pathname === item.href
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
