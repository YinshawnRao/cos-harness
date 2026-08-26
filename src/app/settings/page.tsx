import { SettingsForm } from "@/components/settings/settings-form";
import { loadSettings, toPublicSettings } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const initialSettings = toPublicSettings(loadSettings());

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-[11px] tracking-[0.22em] text-cyan-300/80 uppercase">本机凭证</p>
        <h1 className="mt-1 text-2xl tracking-tight text-zinc-50">设置</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          两份密钥，都只写在这台机器上。保存后界面只显示掩码。
        </p>
        <SettingsForm initialSettings={initialSettings} />
      </div>
    </div>
  );
}
