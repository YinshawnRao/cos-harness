"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
      if (!response.ok) {
        throw new Error(data.error || "保存失败");
      }
      setPublicSettings(data);
      setForm((current) => ({ ...current, llmApiKey: "", secretId: "", secretKey: "" }));
      setMessage("已保存。密钥已加密写入本机，不会再返回到浏览器。");
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
      const failed = {
        ok: false,
        message: err instanceof Error ? err.message : "测试失败",
      };
      if (kind === "llm") setLlmTest(failed);
      else setCosTest(failed);
    } finally {
      setTesting(null);
    }
  }

  return (
    <form className="space-y-6" onSubmit={onSave}>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>出错了</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert>
          <AlertTitle>已保存</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>大模型（BYOK）</CardTitle>
          <CardDescription>
            任意 OpenAI 兼容接口：DeepSeek、Moonshot、OpenAI 或本地代理。Base URL 需包含
            /v1。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Base URL">
            <Input
              value={form.llmBaseUrl}
              onChange={(e) => update("llmBaseUrl", e.target.value)}
              placeholder="https://api.deepseek.com/v1"
              required
            />
          </Field>
          <Field
            label="API Key"
            hint={
              publicSettings?.llm.apiKeySet
                ? `已保存：${publicSettings.llm.apiKeyMasked}。留空表示不修改。`
                : "保存后不会再显示明文。"
            }
          >
            <Input
              type="password"
              autoComplete="off"
              value={form.llmApiKey}
              onChange={(e) => update("llmApiKey", e.target.value)}
              placeholder={publicSettings?.llm.apiKeySet ? "••••••••" : "sk-..."}
            />
          </Field>
          <Field label="模型名">
            <Input
              value={form.llmModel}
              onChange={(e) => update("llmModel", e.target.value)}
              placeholder="deepseek-chat"
              required
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={testing !== null}
              onClick={() => void test("llm")}
            >
              {testing === "llm" ? "测试中…" : "测试 LLM 连接"}
            </Button>
            {llmTest && (
              <span className={llmTest.ok ? "text-xs text-primary" : "text-xs text-destructive"}>
                {llmTest.message}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>腾讯云 COS / 数据万象</CardTitle>
          <CardDescription>
            SecretId / SecretKey 只保存在服务端。调用优先申请 STS 临时密钥；若 STS
            失败则回退为服务端长期密钥，不会下发到浏览器。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="SecretId"
            hint={
              publicSettings?.tencent.secretIdSet
                ? `已保存：${publicSettings.tencent.secretIdMasked}`
                : undefined
            }
          >
            <Input
              autoComplete="off"
              value={form.secretId}
              onChange={(e) => update("secretId", e.target.value)}
              placeholder={publicSettings?.tencent.secretIdSet ? "••••••••" : "AKIDxxxx"}
            />
          </Field>
          <Field label="SecretKey">
            <Input
              type="password"
              autoComplete="off"
              value={form.secretKey}
              onChange={(e) => update("secretKey", e.target.value)}
              placeholder={publicSettings?.tencent.secretKeySet ? "••••••••" : ""}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="地域 Region">
              <Input
                value={form.region}
                onChange={(e) => update("region", e.target.value)}
                placeholder="ap-guangzhou"
                required
              />
            </Field>
            <Field label="默认存储桶" hint="格式 BucketName-APPID">
              <Input
                value={form.bucket}
                onChange={(e) => update("bucket", e.target.value)}
                placeholder="examplebucket-1250000000"
                required
              />
            </Field>
          </div>
          <Field label="AppId（可选）" hint="一般可从桶名末尾自动解析。">
            <Input
              value={form.appId}
              onChange={(e) => update("appId", e.target.value)}
              placeholder="1250000000"
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={testing !== null}
              onClick={() => void test("cos")}
            >
              {testing === "cos" ? "测试中…" : "测试 COS 连接"}
            </Button>
            {cosTest && (
              <span className={cosTest.ok ? "text-xs text-primary" : "text-xs text-destructive"}>
                {cosTest.message}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "保存中…" : "保存设置"}
        </Button>
        <p className="text-xs text-muted-foreground">
          配置加密存放在 data/settings.enc，主密钥为 SETTINGS_ENCRYPTION_KEY 或
          data/.master.key。
        </p>
      </div>
    </form>
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
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
