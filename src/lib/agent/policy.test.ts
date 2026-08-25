import { describe, expect, it } from "vitest";
import {
  TOOL_INPUT_SCHEMAS,
  assertNoSecretFields,
  evaluateToolApproval,
} from "./policy";
import { FORBIDDEN_TOOL_SECRET_FIELDS } from "@/lib/redact";

describe("tool policy", () => {
  it("requires confirmation before delete_object runs", () => {
    expect(
      evaluateToolApproval({
        toolName: "delete_object",
        input: { key: "photos/a.jpg" },
      }),
    ).toBe("user-approval");
  });

  it("allows read tools without confirmation", () => {
    expect(
      evaluateToolApproval({
        toolName: "list_objects",
        input: { prefix: "photos/" },
      }),
    ).toBe("not-applicable");
    expect(
      evaluateToolApproval({
        toolName: "get_signed_url",
        input: { key: "photos/a.jpg" },
      }),
    ).toBe("not-applicable");
  });

  it("requires confirmation when image processing would overwrite the original", () => {
    expect(
      evaluateToolApproval({
        toolName: "process_image",
        input: { key: "a.jpg", writeMode: "overwrite" },
      }),
    ).toBe("user-approval");
    expect(
      evaluateToolApproval({
        toolName: "process_image",
        input: { key: "a.jpg", targetKey: "a.jpg" },
      }),
    ).toBe("user-approval");
    expect(
      evaluateToolApproval({
        toolName: "watermark_text",
        input: { key: "a.jpg", targetKey: "a.watermark.jpg" },
      }),
    ).toBe("not-applicable");
  });

  it("requires confirmation when copy would overwrite an existing dest", () => {
    expect(
      evaluateToolApproval({
        toolName: "copy_object",
        input: { sourceKey: "a.jpg", targetKey: "b.jpg" },
        destExists: true,
      }),
    ).toBe("user-approval");
    expect(
      evaluateToolApproval({
        toolName: "copy_object",
        input: { sourceKey: "a.jpg", targetKey: "b.jpg" },
        destExists: false,
      }),
    ).toBe("not-applicable");
  });

  it("does not expose secret fields on any tool input schema", () => {
    for (const [name, schema] of Object.entries(TOOL_INPUT_SCHEMAS)) {
      const hits = assertNoSecretFields(schema.shape);
      expect(hits, `${name} must not accept secrets`).toEqual([]);
      for (const field of Object.keys(schema.shape)) {
        expect(
          FORBIDDEN_TOOL_SECRET_FIELDS.map((item) => item.toLowerCase()),
        ).not.toContain(field.toLowerCase());
      }
    }
  });
});
