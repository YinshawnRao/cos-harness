import { createOpenAI } from "@ai-sdk/openai";
import type { StoredSettings } from "@/lib/settings/schema";

export function createUserModel(settings: StoredSettings) {
  const openai = createOpenAI({
    baseURL: settings.llm.baseUrl.replace(/\/+$/, ""),
    apiKey: settings.llm.apiKey,
    name: "byok",
  });
  return openai.chat(settings.llm.model);
}

export async function testLlmConnection(settings: StoredSettings): Promise<{
  ok: boolean;
  message: string;
}> {
  const baseURL = settings.llm.baseUrl.replace(/\/+$/, "");
  const url = `${baseURL}/chat/completions`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.llm.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.llm.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 8,
        stream: false,
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        message: `LLM 请求失败 HTTP ${response.status}：${truncateBody(text)}`,
      };
    }
    return {
      ok: true,
      message: `已连通 ${settings.llm.model}（${baseURL}）`,
    };
  } catch (error) {
    return {
      ok: false,
      message: `无法连接 LLM：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function truncateBody(text: string, max = 400): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}
