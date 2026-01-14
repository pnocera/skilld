import { expect, test, describe } from "bun:test";
import { executeClaude } from "./runtimes";
import { getPersonaPrompt } from "./motifs";
import { AnalysisSchema } from "./schemas";

describe("Advisor Schema Validation", () => {
  test("should reject invalid structured_output", () => {
    const invalid = {
      summary: "test",
      issues: [{ severity: "ultra-critical", description: "bad" }], // invalid enum
      suggestions: []
    };
    const parsed = AnalysisSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  test("should handle empty output fields gracefull", () => {
    const minimal = {
      summary: "Short summary",
      issues: [],
      suggestions: []
    };
    const parsed = AnalysisSchema.safeParse(minimal);
    expect(parsed.success).toBe(true);
  });
});

describe("Advisor Integration (E2E)", () => {
  test("Should perform a simple design review", async () => {
    // Skip if no API key is present
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn(" Skipping E2E test: ANTHROPIC_API_KEY not set");
      return;
    }

    const systemPrompt = getPersonaPrompt("design-review");
    const result = await executeClaude(
      systemPrompt,
      "We want to build a real-time chat app using WebSockets and Redis.",
      "design-review",
      45000
    );

    expect(result.summary).toBeDefined();
    expect(result.persona).toBe("design-review");
    expect(Array.isArray(result.issues)).toBe(true);
  }, 60000);

  test.skip("Should throw on timeout - requires API key", async () => {
    const systemPrompt = getPersonaPrompt("design-review");
    const fastTimeout = 1; // 1ms will always fail

    await expect(executeClaude(systemPrompt, "test", "design-review", fastTimeout))
      .rejects.toThrow(/Timed out|aborted/);
  }, 1000);
});
