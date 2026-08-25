import { NextResponse } from "next/server";
import { loadSettings, saveSettingsPatch, toPublicSettings } from "@/lib/settings/store";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(toPublicSettings(loadSettings()));
  } catch (error) {
    logger.error("读取设置失败", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取设置失败" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const publicSettings = saveSettingsPatch(body);
    return NextResponse.json(publicSettings);
  } catch (error) {
    logger.error("保存设置失败", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存设置失败" },
      { status: 400 },
    );
  }
}
