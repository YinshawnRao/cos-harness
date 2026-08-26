import type { Metadata } from "next";
import { Noto_Sans_SC, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { loadSettings, toPublicSettings } from "@/lib/settings/store";

const notoSans = Noto_Sans_SC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "COS Harness",
  description: "腾讯云 COS / 数据万象桌面工作室",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  const initialSettings = toPublicSettings(loadSettings());
  return (
    <html
      lang="zh-CN"
      className={`dark ${notoSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell initialSettings={initialSettings}>{children}</AppShell>
      </body>
    </html>
  );
}
