import {
  convertToModelMessages,
  isStepCount,
  streamText,
  type UIMessage,
} from "ai";
import { createAgentTools, buildToolApproval } from "@/lib/agent/tools";
import { createUserModel } from "@/lib/agent/llm";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { createCosSession } from "@/lib/cos/client";
import { requireSettings } from "@/lib/settings/store";
import { getMasterKey } from "@/lib/crypto";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const settings = requireSettings();
    const { messages }: { messages: UIMessage[] } = await request.json();
    const session = await createCosSession(settings.tencent);
    const tools = await createAgentTools();
    const toolApproval = await buildToolApproval();

    const result = streamText({
      model: createUserModel(settings),
      instructions: buildSystemPrompt({
        bucket: settings.tencent.bucket,
        region: settings.tencent.region,
        credentialMode: session.mode,
      }),
      messages: await convertToModelMessages(messages, { tools }),
      tools,
      toolApproval,
      experimental_toolApprovalSecret: getMasterKey(),
      stopWhen: isStepCount(8),
      onError: ({ error }) => {
        logger.error("chat stream error", error);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    logger.error("chat route failed", error);
    const message = error instanceof Error ? error.message : "对话失败";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
