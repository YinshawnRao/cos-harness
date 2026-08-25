import { redactDeep } from "./redact";

function safeArgs(args: unknown[]): unknown[] {
  return args.map((arg) => redactDeep(arg));
}

export const logger = {
  info: (...args: unknown[]) => {
    console.info("[cos-harness]", ...safeArgs(args));
  },
  warn: (...args: unknown[]) => {
    console.warn("[cos-harness]", ...safeArgs(args));
  },
  error: (...args: unknown[]) => {
    console.error("[cos-harness]", ...safeArgs(args));
  },
};
