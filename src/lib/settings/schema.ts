import { z } from "zod";

export const llmSettingsSchema = z.object({
  baseUrl: z.string().trim().min(1),
  apiKey: z.string().min(1),
  model: z.string().trim().min(1),
});

export const tencentSettingsSchema = z.object({
  secretId: z.string().trim().min(1),
  secretKey: z.string().min(1),
  region: z.string().trim().min(1),
  bucket: z.string().trim().min(1),
  appId: z.string().trim().optional().default(""),
});

export const storedSettingsSchema = z.object({
  llm: llmSettingsSchema,
  tencent: tencentSettingsSchema,
  updatedAt: z.string(),
});

export type LlmSettings = z.infer<typeof llmSettingsSchema>;
export type TencentSettings = z.infer<typeof tencentSettingsSchema>;
export type StoredSettings = z.infer<typeof storedSettingsSchema>;

export const settingsPatchSchema = z.object({
  llm: z
    .object({
      baseUrl: z.string().trim().min(1).optional(),
      apiKey: z.string().optional(),
      model: z.string().trim().min(1).optional(),
    })
    .optional(),
  tencent: z
    .object({
      secretId: z.string().trim().optional(),
      secretKey: z.string().optional(),
      region: z.string().trim().optional(),
      bucket: z.string().trim().optional(),
      appId: z.string().trim().optional(),
    })
    .optional(),
});

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

export type PublicSettings = {
  configured: boolean;
  dataDir: string;
  llm: {
    baseUrl: string;
    model: string;
    apiKeySet: boolean;
    apiKeyMasked: string;
  };
  tencent: {
    secretIdMasked: string;
    secretIdSet: boolean;
    secretKeySet: boolean;
    region: string;
    bucket: string;
    appId: string;
  };
  updatedAt: string | null;
};
