import { expect, test, describe } from "bun:test";
import { executeClaude } from "./runtimes";
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

  test("should handle empty output fields gracefully", () => {
    const minimal = {
      summary: "Short summary",
      issues: [],
      suggestions: []
    };
    const parsed = AnalysisSchema.safeParse(minimal);
    expect(parsed.success).toBe(true);
  });

  test("should accept valid issues with all severity levels", () => {
    const valid = {
      summary: "Test summary",
      issues: [
        { severity: "critical", description: "Critical issue" },
        { severity: "high", description: "High issue" },
        { severity: "medium", description: "Medium issue" },
        { severity: "low", description: "Low issue" }
      ],
      suggestions: ["Suggestion 1", "Suggestion 2"]
    };
    const parsed = AnalysisSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });
});

describe("Advisor Integration (E2E)", () => {
  test("Should perform analysis with custom prompt", async () => {
    // Skip if no API key is present
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("Skipping E2E test: ANTHROPIC_API_KEY not set");
      return;
    }

    const systemPrompt = `You are an expert adviser. Analyze the input and return structured feedback.
    
Return a JSON object with:
- summary: Brief overview of what you see
- issues: Array of {severity, description} where severity is critical/high/medium/low
- suggestions: Array of improvement strings`;

    const result = await executeClaude(
      systemPrompt,
      "We want to build a real-time chat app using WebSockets and Redis.",
      45000
    );

    expect(result.summary).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(Array.isArray(result.issues)).toBe(true);
    expect(Array.isArray(result.suggestions)).toBe(true);
  }, 60000);

  test.skip("Should throw on timeout - requires API key", async () => {
    const systemPrompt = "You are a test adviser.";
    const fastTimeout = 1; // 1ms will always fail

    await expect(executeClaude(systemPrompt, "test", fastTimeout))
      .rejects.toThrow(/Timed out|aborted/);
  }, 1000);
});
