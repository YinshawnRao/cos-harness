import { NextResponse } from "next/server";
import { testLlmConnection } from "@/lib/agent/llm";
import { requireSettings } from "@/lib/settings/store";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const settings = requireSettings();
    const result = await testLlmConnection(settings);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    logger.error("测试 LLM 失败", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "测试 LLM 失败",
      },
      { status: 400 },
    );
  }
}
