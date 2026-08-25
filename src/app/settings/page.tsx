import { SettingsForm } from "@/components/settings/settings-form";
import { loadSettings, toPublicSettings } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const initialSettings = toPublicSettings(loadSettings());

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          填写你自己的 OpenAI 兼容模型接口与腾讯云 COS 凭证。保存后密钥不会再回传到浏览器。
        </p>
      </div>
      <SettingsForm initialSettings={initialSettings} />
    </div>
  );
}
