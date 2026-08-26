import { createCosSession, resolveBucket, resolveRegion } from "./client";
import { CosOperations } from "./operations";
import { requireSettings } from "@/lib/settings/store";

export async function withCosOps() {
  const settings = requireSettings();
  const session = await createCosSession(settings.tencent);
  return {
    settings,
    session,
    operations: new CosOperations(session.cos),
    bucket: (override?: string) => resolveBucket(settings.tencent, override),
    region: () => resolveRegion(settings.tencent),
  };
}

export function apiError(error: unknown, fallback: string) {
  return {
    error: error instanceof Error ? error.message : fallback,
  };
}
