"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudio } from "@/components/studio/studio-context";
import type { PublicSettings } from "@/lib/settings/schema";

type TestResult = { ok: boolean; message: string; credentialMode?: string };

function formFromPublic(data: PublicSettings) {
  return {
    llmBaseUrl: data.llm.baseUrl || "https://api.deepseek.com/v1",
    llmApiKey: "",
    llmModel: data.llm.model || "deepseek-chat",
    secretId: "",
    secretKey: "",
    region: data.tencent.region || "ap-guangzhou",
    bucket: data.tencent.bucket,
    appId: data.tencent.appId,
  };
}

export function SettingsForm({
  initialSettings,
}: {
  initialSettings: PublicSettings;
}) {
  const { loadSettings: reloadStudio, refresh } = useStudio();
  const [form, setForm] = useState(() => formFromPublic(initialSettings));
  const [publicSettings, setPublicSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [llmTest, setLlmTest] = useState<TestResult | null>(null);
  const [cosTest, setCosTest] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState<"llm" | "cos" | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm: {
            baseUrl: form.llmBaseUrl,
            model: form.llmModel,
            apiKey: form.llmApiKey,
          },
          tencent: {
            secretId: form.secretId,
            secretKey: form.secretKey,
            region: form.region,
            bucket: form.bucket,
            appId: form.appId,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存失败");
      setPublicSettings(data);
      setForm((current) => ({ ...current, llmApiKey: "", secretId: "", secretKey: "" }));
      setMessage("已写入本机。密钥不会再回传到界面。");
      const latest = await reloadStudio();
      await refresh(undefined, latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function test(kind: "llm" | "cos") {
    setTesting(kind);
    setError(null);
    try {
      const response = await fetch(
        kind === "llm" ? "/api/settings/test-llm" : "/api/settings/test-cos",
        { method: "POST" },
      );
      const data = (await response.json()) as TestResult;
      if (kind === "llm") setLlmTest(data);
      else setCosTest(data);
    } catch (err) {
      const failed = { ok: false, message: err instanceof Error ? err.message : "测试失败" };
      if (kind === "llm") setLlmTest(failed);
      else setCosTest(failed);
    } finally {
      setTesting(null);
    }
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={onSave}>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-cyan-200">{message}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-medium">大模型</h2>
              <p className="mt-1 text-[12px] text-zinc-500">OpenAI 兼容，Base URL 含 /v1</p>
            </div>
            <StatusPill result={llmTest} />
          </div>
          <div className="mt-5 grid gap-3">
            <Field label="Base URL">
              <Input
                value={form.llmBaseUrl}
                onChange={(e) => update("llmBaseUrl", e.target.value)}
                required
              />
            </Field>
            <Field
              label="API Key"
              hint={
                publicSettings.llm.apiKeySet
                  ? `已保存 ${publicSettings.llm.apiKeyMasked}`
                  : "保存后只显示掩码"
              }
            >
              <Input
                type="password"
                autoComplete="off"
                value={form.llmApiKey}
                onChange={(e) => update("llmApiKey", e.target.value)}
                placeholder={publicSettings.llm.apiKeySet ? "••••••••" : "sk-..."}
              />
            </Field>
            <Field label="模型">
              <Input
                value={form.llmModel}
                onChange={(e) => update("llmModel", e.target.value)}
                required
              />
            </Field>
            <Button
              type="button"
              variant="outline"
              disabled={testing !== null}
              onClick={() => void test("llm")}
            >
              {testing === "llm" ? "测试中…" : "测试连接"}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-medium">腾讯云 COS</h2>
              <p className="mt-1 text-[12px] text-zinc-500">STS 优先，失败则本机长期密钥</p>
            </div>
            <StatusPill result={cosTest} />
          </div>
          <div className="mt-5 grid gap-3">
            <Field
              label="SecretId"
              hint={
                publicSettings.tencent.secretIdSet
                  ? `已保存 ${publicSettings.tencent.secretIdMasked}`
                  : undefined
              }
            >
              <Input
                autoComplete="off"
                value={form.secretId}
                onChange={(e) => update("secretId", e.target.value)}
                placeholder={publicSettings.tencent.secretIdSet ? "••••••••" : "AKIDxxxx"}
              />
            </Field>
            <Field label="SecretKey">
              <Input
                type="password"
                autoComplete="off"
                value={form.secretKey}
                onChange={(e) => update("secretKey", e.target.value)}
                placeholder={publicSettings.tencent.secretKeySet ? "••••••••" : ""}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="地域">
                <Input
                  value={form.region}
                  onChange={(e) => update("region", e.target.value)}
                  required
                />
              </Field>
              <Field label="默认桶">
                <Input
                  value={form.bucket}
                  onChange={(e) => update("bucket", e.target.value)}
                  placeholder="name-1250000000"
                  required
                />
              </Field>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={testing !== null}
              onClick={() => void test("cos")}
            >
              {testing === "cos" ? "测试中…" : "测试连接"}
            </Button>
          </div>
        </section>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </Button>
        <p className="text-[11px] text-zinc-500">
          {publicSettings.dataDir}/settings.enc
        </p>
      </div>
    </form>
  );
}

function StatusPill({ result }: { result: TestResult | null }) {
  if (!result) {
    return (
      <span className="rounded-full border border-white/8 px-2 py-0.5 text-[10px] text-zinc-500">
        未测
      </span>
    );
  }
  return (
    <span
      className={
        result.ok
          ? "rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-200"
          : "rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[10px] text-red-300"
      }
      title={result.message}
    >
      {result.ok ? "已连通" : "失败"}
    </span>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}
