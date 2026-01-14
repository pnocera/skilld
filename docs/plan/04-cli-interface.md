# Plan Part 4: CLI Interface

**Focus**: Main entry point and argument parsing.

### Task 7: Implement Main Entry Point

**Files:**
- Create: `skills/adviser/index.ts`

**Step 1: Write Main Logic**
Create `skills/adviser/index.ts`:

```typescript
import { getPersonaPrompt } from './prompts';
import { executeClaude } from './executor';
import { handleOutput } from './output';
import type { PersonaType, OutputMode } from './types';
import { which } from 'bun';

async function main() {
  const args = process.argv.slice(2);
  
  // 0. Runtime check
  const claudePath = await which('claude');
  if (!claudePath) {
    console.error('[Advisor] Error: Claude Code CLI (claude) not found. This is required by the Agent SDK.');
    console.error('Please install it: curl -fsSL https://claude.ai/install.sh | bash');
    process.exit(1);
  }

  if (args.length < 1) {
    console.error('Usage: advisor <taskType> [mode] [context] [timeout]');
    process.exit(1);
  }

  const taskType = args[0] as PersonaType;
  const mode = (args[1] as OutputMode) || 'human';
  const context = args[2] || '';
  const timeout = parseInt(args[3] || '60000', 10);

  // 1. Validation
  const validTaskTypes = ['design-review', 'plan-analysis', 'code-verification'];
  if (!validTaskTypes.includes(taskType)) {
    console.error(`Invalid task type: ${taskType}. Must be one of: ${validTaskTypes.join(', ')}`);
    process.exit(1);
  }

  if (context.length === 0) {
    console.error('Context is required for analysis.');
    process.exit(1);
  }

  if (context.length > 50000) {
    console.error('Context too large. Please limit input to 50,000 characters.');
    process.exit(1);
  }

  try {
    console.log(`[Advisor] Starting ${taskType} in ${mode} mode...`);

    // 2. Load system prompt
    const systemPrompt = getPersonaPrompt(taskType);

    // 3. Execute via Agent SDK
    const analysisResult = await executeClaude(systemPrompt, context, taskType, timeout);

    // 4. Handle Result Output
    const resultMsg = await handleOutput(analysisResult, mode, taskType);
    
    // Print final result
    console.log(resultMsg);

    process.exit(0);
  } catch (error) {
    console.error(`[Advisor] Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Run if main
if (import.meta.main) {
  main();
}
```

**Step 2: Integration & Robustness Tests**
Create `skills/adviser/adviser.test.ts`:
```typescript
import { expect, test, describe } from "bun:test";
import { executeClaude } from "./executor";
import { getPersonaPrompt } from "./prompts";
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
});

describe("Advisor Integration (E2E)", () => {
  // Use a longer timeout for E2E tests to avoid flakiness
  const TEST_TIMEOUT = 60000;

  test("Should perform a simple design review", async () => {
    // Skip if no API key is present
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("Skipping E2E test: ANTHROPIC_API_KEY not set");
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
  }, TEST_TIMEOUT);

  test("Should throw on timeout", async () => {
    const systemPrompt = getPersonaPrompt("design-review");
    const fastTimeout = 1; // 1ms will always fail
    
    await expect(executeClaude(systemPrompt, "test", "design-review", fastTimeout))
      .rejects.toThrow(/Timed out/);
  }, 1000);
});
```

**Step 3: Commit**
```bash
git add skills/adviser/index.ts skills/adviser/adviser.test.ts
git commit -m "feat: add main entry point and robust E2E/Unit test suite"
```
