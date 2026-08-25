const SECRET_KEY_PATTERN =
  /^(secretkey|secret_key|apikey|api_key|sessiontoken|session_token|tmpsecretkey|tmp_secret_key|password|token|authorization)$/i;

const SECRET_VALUE_HINTS = [
  /sk-[a-zA-Z0-9]{8,}/g,
  /AKID[a-zA-Z0-9]{8,}/g,
];

export function maskSecret(secret: string | undefined | null): string {
  if (!secret) return "";
  const value = String(secret);
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export function isSecretFieldName(name: string): boolean {
  return SECRET_KEY_PATTERN.test(name.replace(/[-_\s]/g, ""));
}

function redactString(value: string): string {
  let next = value;
  for (const pattern of SECRET_VALUE_HINTS) {
    next = next.replace(pattern, (match) => maskSecret(match));
  }
  return next;
}

export function redactDeep<T>(input: T): T {
  return redactValue(input) as T;
}

function redactValue(input: unknown): unknown {
  if (input == null) return input;
  if (typeof input === "string") return redactString(input);
  if (Array.isArray(input)) return input.map(redactValue);
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (isSecretFieldName(key) && typeof value === "string") {
        out[key] = maskSecret(value);
      } else {
        out[key] = redactValue(value);
      }
    }
    return out;
  }
  return input;
}

export function summarizeArgs(args: unknown, maxLen = 280): string {
  try {
    const text = JSON.stringify(redactDeep(args));
    if (!text) return "";
    return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
  } catch {
    return "[unserializable]";
  }
}

export const FORBIDDEN_TOOL_SECRET_FIELDS = [
  "secretKey",
  "SecretKey",
  "apiKey",
  "sessionToken",
  "tmpSecretKey",
] as const;
