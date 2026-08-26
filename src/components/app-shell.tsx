"use client";

import { Titlebar } from "@/components/studio/titlebar";
import { StudioProvider } from "@/components/studio/studio-context";
import type { PublicSettings } from "@/lib/settings/schema";

export function AppShell({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings: PublicSettings;
}) {
  return (
    <StudioProvider initialSettings={initialSettings}>
      <div className="flex h-dvh flex-col overflow-hidden bg-[#07090c] text-zinc-100">
        <Titlebar />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </StudioProvider>
  );
}
