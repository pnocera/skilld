import { expect, test, describe } from "bun:test";
import { getPersonaPrompt } from "./motifs";

describe("Prompt Loader", () => {
  test("should load design-review prompt", () => {
    const prompt = getPersonaPrompt("design-review");
    expect(prompt).toContain("Architect");
  });

  test("should load plan-analysis prompt", () => {
    const prompt = getPersonaPrompt("plan-analysis");
    expect(prompt).toContain("Strategist");
  });

  test("should throw on unknown persona", () => {
    expect(() => getPersonaPrompt("invalid" as any)).toThrow();
  });
});
