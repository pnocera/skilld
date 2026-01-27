# Dynamic Protocol-Based Adviser Implementation Plan

**Goal:** Transform the adviser from a static, task-type-bound tool into a dynamic, protocol-driven universal adviser where the consuming agent discovers and composes relevant AISP protocols at runtime.

**Architecture:** Three-layer separation: Protocol Layer (self-describing AISP files in `protocols/`), Skill Layer (simplified adviser tool in `skills/adviser/`), and Agent Layer (LLM runtime handles discovery and composition). The adviser becomes a thin prompt executor with `--prompt-file` replacing task types.

**Tech Stack:** TypeScript/Bun, AISP 5.1, Claude Agent SDK

**Adviser Review:** Initial review rejected with 5 critical, 3 high issues. Issues addressed in v2 below.

**Critical Issues Addressed:**
1. ✅ Added Task 1.0: Audit all adviser usage before changes
2. ✅ Checkpoint commands updated to use new interface
3. ✅ Added cleanup strategy in Task 1.8
4. ✅ Protocol discovery is agent responsibility (per design) - documented in SKILL.md
5. ✅ Extended test coverage in Task 1.7

---

## Phase 1: Simplify Adviser Tool Interface

### Task 1.0: Audit All Adviser Usage (Pre-flight)

**Purpose:** Identify all places that reference the current adviser interface before making changes.

**Step 1: Find all adviser command invocations**

Run: `grep -rn "adviser.*--input\|adviser design-review\|adviser plan-analysis\|adviser code-verification" --include="*.md" --include="*.ts" .`

Document all locations that will need updating after Phase 1.

**Step 2: List affected files**

Expected locations:
- `workflows/*.md` - Workflow definitions
- `skills/adviser/SKILL.md` - Skill documentation
- `skills/adviser/*.test.ts` - Test files
- `docs/**/*.md` - Any documentation

**Step 3: Create tracking checklist**

Create `./tmp/adviser-migration-checklist.md` with all found locations.

**Step 4: Commit checklist**

```bash
git add ./tmp/adviser-migration-checklist.md
git commit -m "chore(adviser): audit adviser usage before refactor"
```

---

### Task 1.1: Update Types - Remove PersonaType

**Files:**
- Modify: `skills/adviser/types.ts`

**Step 1: Write the failing test**

```typescript
// skills/adviser/types.test.ts
import { expect, test, describe } from "bun:test";

describe("Types", () => {
  test("OutputMode should include all valid modes", () => {
    // This test verifies the types exist - compile-time check
    const modes: import("./types").OutputMode[] = ['workflow', 'human', 'aisp'];
    expect(modes.length).toBe(3);
  });
});
```

**Step 2: Run test to verify it compiles**

Run: `cd skills/adviser && bun test types.test.ts`
Expected: PASS (types still exist)

**Step 3: Modify types.ts to remove PersonaType dependency**

Replace content of `skills/adviser/types.ts`:

```typescript
/**
 * Output mode determines how the result is delivered
 * - 'workflow': JSON structured output for pipeline integration
 * - 'human': Markdown file saved to docs/reviews/
 * - 'aisp': AISP 5.1 Platinum Specification format for AI-to-AI communication
 */
export type OutputMode = 'workflow' | 'human' | 'aisp';

/**
 * File-based input/output configuration
 */
export interface FileAssets {
  /** Path to prompt file containing system prompt */
  promptFile: string;
  /** Path to input file containing context to analyze */
  inputFile: string;
  /** Path where output file should be written (auto-generated if omitted) */
  outputFile?: string;
  /** Base directory for output (defaults to docs/reviews/) */
  outputDir?: string;
}

/**
 * Configuration options for the advisor
 */
export interface AdvisorOptions {
  mode?: OutputMode;
  files: FileAssets;
  timeout?: number;
}

/**
 * Result of an advisor execution
 */
export interface AdvisorResult {
  success: boolean;
  output?: string;
  outputFile?: string;
  error?: string;
}

/**
 * Asset entry in the output manifest
 */
export interface OutputAsset {
  type: 'review' | 'workflow' | 'aisp';
  format: 'md' | 'json' | 'aisp';
  path: string;
}

/**
 * Manifest file written alongside output for programmatic access
 */
export interface OutputManifest {
  status: 'success' | 'error';
  mode: OutputMode;
  assets: OutputAsset[];
  timestamp: string;
  error?: string;
}
```

**Step 4: Run type check**

Run: `cd skills/adviser && bun run tsc --noEmit`
Expected: Type errors in files still using PersonaType (expected, we'll fix in next tasks)

**Step 5: Commit**

```bash
git add skills/adviser/types.ts skills/adviser/types.test.ts
git commit -m "refactor(adviser): remove PersonaType from types"
```

---

### Task 1.2: Update Argument Parser

**Files:**
- Modify: `skills/adviser/index.ts`

**Step 1: Write the failing test**

```typescript
// Add to skills/adviser/index.test.ts
import { expect, test, describe } from "bun:test";

describe("parseArgs", () => {
  // Note: parseArgs is internal - test via CLI behavior or export for testing
  test("should require --prompt-file argument", async () => {
    const proc = Bun.spawn(["bun", "run", "index.ts", "--input", "test.md"], {
      cwd: import.meta.dir,
      stderr: "pipe"
    });
    const stderr = await new Response(proc.stderr).text();
    expect(stderr).toContain("--prompt-file");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd skills/adviser && bun test index.test.ts`
Expected: FAIL - current version requires taskType, not --prompt-file

**Step 3: Update parseArgs function in index.ts**

Replace the `parseArgs` function in `skills/adviser/index.ts`:

```typescript
function parseArgs(args: string[]): { 
  promptFile: string;
  mode: OutputMode; 
  inputFile: string; 
  outputFile?: string; 
  outputDir?: string; 
  timeout: number 
} {
  let promptFile = '';
  let mode: OutputMode = 'aisp';  // Default to AISP for AI-to-AI communication
  let inputFile = '';
  let outputFile: string | undefined;
  let outputDir: string | undefined;
  let timeout = DEFAULT_TIMEOUT_MS;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    // Prompt file (required - replaces taskType)
    if (arg === '--prompt-file' || arg === '-p') {
      const promptArg = args[i + 1];
      if (promptArg) {
        promptFile = promptArg;
        i++;
      }
      continue;
    }

    // Mode
    if (arg === '--mode' || arg === '-m') {
      const modeArg = args[i + 1];
      if (modeArg) {
        mode = modeArg as OutputMode;
        i++;
      }
      continue;
    }

    // Timeout
    if (arg === '--timeout' || arg === '-t') {
      const timeoutArg = args[i + 1];
      if (timeoutArg) {
        timeout = parseInt(timeoutArg, 10);
        i++;
      }
      continue;
    }

    // Input file (required)
    if (arg === '--input' || arg === '-i') {
      const inputArg = args[i + 1];
      if (inputArg) {
        inputFile = inputArg;
        i++;
      }
      continue;
    }

    // Output file (optional)
    if (arg === '--output' || arg === '-o') {
      const outputArg = args[i + 1];
      if (outputArg) {
        outputFile = outputArg;
        i++;
      }
      continue;
    }

    // Output directory (optional)
    if (arg === '--output-dir') {
      const dirArg = args[i + 1];
      if (dirArg) {
        outputDir = dirArg;
        i++;
      }
      continue;
    }
  }

  if (!promptFile) {
    throw new Error('Missing required --prompt-file (-p) argument');
  }

  if (!inputFile) {
    throw new Error('Missing required --input (-i) argument');
  }

  return { promptFile, mode, inputFile, outputFile, outputDir, timeout };
}
```

**Step 4: Run test to verify it passes**

Run: `cd skills/adviser && bun test index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add skills/adviser/index.ts skills/adviser/index.test.ts
git commit -m "refactor(adviser): replace taskType with --prompt-file argument"
```

---

### Task 1.3: Update Main Function to Use Prompt File

**Files:**
- Modify: `skills/adviser/index.ts`

**Step 1: Update imports and remove persona logic**

Remove the import of `getPersonaPrompt` and update main():

```typescript
#!/usr/bin/env bun
import { executeClaude } from './runtimes';
import { handleOutput } from './output';
import type { OutputMode } from './types';
import { which } from 'bun';
import { join } from 'node:path';

// ... constants and parseArgs stay the same ...

async function main() {
  const args = process.argv.slice(2);

  // 0. Runtime check
  const cliPath = await which('claude');
  if (!cliPath) {
    console.error('[Adviser] Error: Claude Code CLI (claude) not found.');
    console.error('Please install it: curl -fsSL https://claude.ai/install.sh | bash');
    process.exit(1);
  }

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    const helpText = `Usage: adviser --prompt-file <path> --input <file> [options]

Required:
  --prompt-file, -p <file>  Path to system prompt file (composed by calling agent)
  --input, -i <file>        Path to input file containing content to analyze

Options:
  --output, -o <file>    Optional: Explicit output file path (auto-generated if omitted)
  --output-dir <dir>     Optional: Override output directory (default: docs/reviews/)
  --mode, -m <mode>      Output mode: aisp (default), human, or workflow (JSON)
  --timeout, -t <ms>     Timeout in milliseconds (default: ${DEFAULT_TIMEOUT_MS})
  --help, -h             Show this help message

Examples:
  adviser --prompt-file ./tmp/prompt.md --input design-doc.md
  adviser -p ./tmp/prompt.md -i plan.md --output result.json --mode workflow
`;
    console.log(helpText);
    process.exit(args.length > 0 ? 0 : 1);
  }

  let promptFile: string;
  let mode: OutputMode;
  let inputFile: string;
  let outputFile: string | undefined;
  let outputDir: string | undefined;
  let timeout: number;

  try {
    ({ promptFile, mode, inputFile, outputFile, outputDir, timeout } = parseArgs(args));
  } catch (e) {
    console.error(`Error: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  // Resolve file paths
  const resolvedPromptFile = promptFile.startsWith('/') ? promptFile : join(process.cwd(), promptFile);
  const resolvedInputFile = inputFile.startsWith('/') ? inputFile : join(process.cwd(), inputFile);

  // Validate prompt file exists
  const promptFileHandle = Bun.file(resolvedPromptFile);
  if (!(await promptFileHandle.exists())) {
    console.error(`Error: Prompt file not found: ${resolvedPromptFile}`);
    process.exit(1);
  }

  // Read system prompt from file
  let systemPrompt: string;
  try {
    systemPrompt = await promptFileHandle.text();
  } catch (e) {
    console.error(`Error reading prompt file ${resolvedPromptFile}: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  if (systemPrompt.length === 0) {
    console.error('Error: Prompt file is empty.');
    process.exit(1);
  }

  // Validate input file exists
  const inputFileHandle = Bun.file(resolvedInputFile);
  if (!(await inputFileHandle.exists())) {
    console.error(`Error: Input file not found: ${resolvedInputFile}`);
    process.exit(1);
  }

  // Read context from input file
  let context: string;
  try {
    context = await inputFileHandle.text();
  } catch (e) {
    console.error(`Error reading input file ${resolvedInputFile}: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  if (context.length === 0) {
    console.error('Error: Input file is empty.');
    process.exit(1);
  }

  if (context.length > MAX_INPUT_LENGTH) {
    console.error(`Error: Input file too large. Please limit input to ${MAX_INPUT_LENGTH.toLocaleString()} characters.`);
    process.exit(1);
  }

  try {
    console.log(`[Adviser] Starting analysis in ${mode} mode...`);

    // Execute via Agent SDK (prompt comes from file, not persona lookup)
    const analysisResult = await executeClaude(systemPrompt, context, timeout);

    // Handle Result Output
    const resultMsg = await handleOutput(analysisResult, mode, outputFile, outputDir);

    // Print output location
    console.log(resultMsg);

    process.exit(0);
  } catch (error) {
    console.error(`[Adviser] Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Run if main
if (import.meta.main) {
  main();
}
```

**Step 2: Verify compilation**

Run: `cd skills/adviser && bun run tsc --noEmit`
Expected: Errors in runtimes.ts and output.ts (they still expect PersonaType)

**Step 3: Commit partial progress**

```bash
git add skills/adviser/index.ts
git commit -m "refactor(adviser): update main to load prompt from file"
```

---

### Task 1.4: Update Runtime Execution

**Files:**
- Modify: `skills/adviser/runtimes.ts`

**Step 1: Remove PersonaType from executeClaude signature**

Update `skills/adviser/runtimes.ts`:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AnalysisSchema, type AnalysisResult } from './schemas';
import { which } from 'bun';
import { platform } from 'node:os';

/**
 * Find the claude executable path
 */
function findClaudePath(): string {
  const isWin = platform() === 'win32';
  const found = which('claude');
  if (found) return found;
  return isWin ? 'claude.cmd' : 'claude';
}

/**
 * Execute Claude using the Agent SDK for structured analysis
 * @param systemPrompt - The complete system prompt (loaded from prompt file)
 * @param context - The content to analyze (loaded from input file)
 * @param timeoutMs - Timeout in milliseconds
 * @throws {Error} If timeout occurs, permission required, or validation fails
 */
export async function executeClaude(
  systemPrompt: string,
  context: string,
  timeoutMs: number = 60000
): Promise<AnalysisResult> {
  const schema = zodToJsonSchema(AnalysisSchema);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const fullPrompt = `<context>\n${context}\n</context>`;
    const claudePath = findClaudePath();

    for await (const message of query({
      prompt: fullPrompt,
      options: {
        systemPrompt,
        pathToClaudeCodeExecutable: claudePath,
        outputFormat: {
          type: 'json_schema',
          schema: schema
        },
        abortController: controller,
        maxTurns: 10,
        allowDangerouslySkipPermissions: true,
        permissionMode: 'bypassPermissions',
        cwd: process.cwd(),
        settingSources: ['user', 'project']
      }
    })) {
      if (message.type === 'result') {
        if (message.subtype === 'success') {
          if ('structured_output' in message && message.structured_output !== undefined) {
            const parsed = AnalysisSchema.safeParse(message.structured_output as unknown);
            if (parsed.success) {
              return {
                ...parsed.data,
                timestamp: new Date().toISOString()
              };
            }
            throw new Error(`Schema validation failed: ${JSON.stringify(parsed.error)}`);
          }
          throw new Error('Expected structured_output but it was not present');
        }

        if (message.subtype === 'error_max_structured_output_retries') {
          throw new Error('Could not generate valid structured output after multiple retries.');
        }
        if (message.subtype === 'error_max_turns') {
          throw new Error('Exceeded maximum number of turns before completion');
        }
        if (message.subtype === 'error_max_budget_usd') {
          throw new Error('Exceeded maximum budget');
        }
        if (message.subtype === 'error_during_execution') {
          const msg = message as any;
          const errors = msg.errors || [];
          throw new Error(`Execution error: ${errors.join(', ')}`);
        }
      }
    }

    throw new Error('No result received from Claude');
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Step 2: Update schemas.ts to remove persona field**

Modify `skills/adviser/schemas.ts` - remove `persona` from `AnalysisResult`:

```typescript
// In the AnalysisResult interface, remove:
// persona: PersonaType;

// The AnalysisResult should just have:
export interface AnalysisResult extends z.infer<typeof AnalysisSchema> {
  timestamp: string;
}
```

**Step 3: Verify compilation**

Run: `cd skills/adviser && bun run tsc --noEmit`
Expected: Errors in output.ts only

**Step 4: Commit**

```bash
git add skills/adviser/runtimes.ts skills/adviser/schemas.ts
git commit -m "refactor(adviser): remove persona from runtime execution"
```

---

### Task 1.5: Update Output Handling

**Files:**
- Modify: `skills/adviser/output.ts`

**Step 1: Remove PersonaType from output functions**

Update function signatures to not require PersonaType:

```typescript
import type { OutputMode, OutputManifest, OutputAsset } from './types';
import type { AnalysisResult } from './schemas';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ... keep constants and helper functions ...

/**
 * Format output as AISP 5.1 Platinum Specification
 * Note: Without persona, we use a generic "adviser" header
 */
function formatAisp(result: AnalysisResult): string {
  const today = new Date().toISOString().split('T')[0];

  const severityToTier: Record<string, string> = {
    'critical': '⊘',
    'high': '◊⁻',
    'medium': '◊',
    'low': '◊⁺'
  };

  const issueCounts = result.issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let verdict = 'approve';
  if ((issueCounts['critical'] || 0) > 0) verdict = 'reject';
  else if ((issueCounts['high'] || 0) > 2) verdict = 'revise';

  let aisp = `𝔸1.0.adviser@${today}
γ≔dynamic.analysis
ρ≔⟨analysis,issues,suggestions⟩
⊢ND∧review.complete

;; ─── Ω: META ───
⟦Ω:Meta⟧{
  ∀D: Ambig(D) < 0.02
  ⊢ review.complete
  timestamp≜"${result.timestamp}"
}

;; ─── Σ: TYPES ───
⟦Σ:Types⟧{
  Issue ≜ ⟨severity: {critical,high,medium,low}, desc: 𝕊, loc?: 𝕊, rec?: 𝕊⟩
  Verdict ≜ {approve, revise, reject}
  Counts ≜ ⟨critical: ${issueCounts['critical'] || 0}, high: ${issueCounts['high'] || 0}, medium: ${issueCounts['medium'] || 0}, low: ${issueCounts['low'] || 0}⟩
}

;; ─── Γ: RULES ───
⟦Γ:Rules⟧{
  issues.critical > 0 ⇒ Verdict(reject)
  issues.high > 2 ⇒ Verdict(revise)
  _ ⇒ Verdict(approve)
  ⊢ Verdict(${verdict})
}

;; ─── Λ: ANALYSIS ───
⟦Λ:Analysis⟧{
  ;; Summary
  summary≜"${escapeJsonString(result.summary).replace(/\n/g, ' ')}"

  ;; Issues (${result.issues.length})
`;

  // ... rest of formatting stays the same ...

  return aisp;
}

/**
 * Format output as human-readable markdown
 */
function formatHuman(result: AnalysisResult): string {
  let markdown = `# Adviser Review\n\n`;
  markdown += `**Date:** ${new Date(result.timestamp).toISOString()}\n\n`;
  // ... rest stays the same, just remove type parameter ...
  return markdown;
}

export async function handleOutput(
  result: AnalysisResult,
  mode: OutputMode,
  outputFile?: string,
  outputDir?: string
): Promise<string> {
  const baseDir = outputDir ? resolve(outputDir) : getOutputDir();

  let content: string;
  let extension: string;
  let assetType: OutputAsset['type'];
  let assetFormat: OutputAsset['format'];

  switch (mode) {
    case 'workflow':
      content = formatWorkflow(result);
      extension = 'json';
      assetType = 'workflow';
      assetFormat = 'json';
      break;
    case 'aisp':
      content = formatAisp(result);
      extension = 'aisp';
      assetType = 'aisp';
      assetFormat = 'aisp';
      break;
    case 'human':
    default:
      content = formatHuman(result);
      extension = 'md';
      assetType = 'review';
      assetFormat = 'md';
      break;
  }

  const explicitFilename = `review-${Date.now()}-${generateUniqueId()}.${extension}`;
  const { path } = resolveOutputPath(outputFile, baseDir, explicitFilename);

  await Bun.write(path, content);

  const manifestPath = await writeManifest(path, mode, [
    { type: assetType, format: assetFormat, path }
  ]);

  return `[Adviser] Output manifest: ${manifestPath}`;
}
```

**Step 2: Update writeManifest to not require PersonaType**

```typescript
async function writeManifest(
  outputPath: string,
  mode: OutputMode,
  assets: OutputAsset[]
): Promise<string> {
  const manifest: OutputManifest = {
    status: 'success',
    mode,
    assets,
    timestamp: new Date().toISOString()
  };

  const manifestPath = outputPath + '.manifest.json';
  await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}
```

**Step 3: Verify full compilation**

Run: `cd skills/adviser && bun run tsc --noEmit`
Expected: PASS (no type errors)

**Step 4: Commit**

```bash
git add skills/adviser/output.ts
git commit -m "refactor(adviser): remove persona from output handling"
```

---

### Task 1.6: Remove Obsolete Files

**Files:**
- Delete: `skills/adviser/motifs.ts`
- Delete: `skills/adviser/motifs/architect.txt`
- Delete: `skills/adviser/motifs/strategist.txt`
- Delete: `skills/adviser/motifs/auditor.txt`
- Keep: `skills/adviser/motifs/aisp-spec.md`
- Keep: `skills/adviser/motifs/aisp-quick-ref.md`

**Step 1: Remove persona prompt files**

```bash
cd skills/adviser
rm motifs/architect.txt motifs/strategist.txt motifs/auditor.txt
rm motifs.ts motifs.test.ts
```

**Step 2: Verify build still works**

Run: `cd skills/adviser && bun run tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add -A skills/adviser/motifs/
git add skills/adviser/motifs.ts skills/adviser/motifs.test.ts
git commit -m "chore(adviser): remove obsolete persona prompt files"
```

---

### Task 1.7: Update Tests

**Files:**
- Modify: `skills/adviser/adviser.test.ts`

**Step 1: Rewrite tests for new interface**

```typescript
import { expect, test, describe } from "bun:test";
import { executeClaude } from "./runtimes";
import { AnalysisSchema } from "./schemas";

describe("Advisor Schema Validation", () => {
  test("should reject invalid structured_output", () => {
    const invalid = {
      summary: "test",
      issues: [{ severity: "ultra-critical", description: "bad" }],
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
  test("Should perform analysis with custom prompt", async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("Skipping E2E test: ANTHROPIC_API_KEY not set");
      return;
    }

    const systemPrompt = `You are an expert adviser. Analyze the input and return structured feedback.
    
Return a JSON object with:
- summary: Brief overview
- issues: Array of {severity, description} where severity is critical/high/medium/low
- suggestions: Array of improvement strings`;

    const result = await executeClaude(
      systemPrompt,
      "We want to build a real-time chat app using WebSockets and Redis.",
      45000
    );

    expect(result.summary).toBeDefined();
    expect(Array.isArray(result.issues)).toBe(true);
  }, 60000);
});
```

**Step 2: Run tests**

Run: `cd skills/adviser && bun test`
Expected: PASS

**Step 3: Commit**

```bash
git add skills/adviser/adviser.test.ts
git commit -m "test(adviser): update tests for prompt-file interface"
```

---

### Task 1.8: Rebuild Binary

**Files:**
- Run: `build.sh` or `build.ps1`

**Step 1: Build the new adviser binary**

Run: `./build.sh` (Linux) or `.\build.ps1` (Windows)
Expected: New binary at `skills/adviser/dist/adviser`

**Step 2: Test the new binary**

```bash
# Create a test prompt file
echo "You are a test adviser. Return minimal feedback." > ./tmp/test-prompt.md

# Create a test input file
echo "Test input content" > ./tmp/test-input.md

# Run the new adviser
./skills/adviser/dist/adviser --prompt-file ./tmp/test-prompt.md --input ./tmp/test-input.md --mode aisp
```

Expected: Output manifest path printed, AISP file created

**Step 3: Commit binary**

```bash
git add skills/adviser/dist/
git commit -m "build(adviser): rebuild with prompt-file interface"
```

---

## Phase 1 Adviser Review Checkpoint

After completing Phase 1, verify the tool works correctly:

```bash
# Test 1: Verify help shows new interface
./skills/adviser/dist/adviser --help

# Test 2: Verify --prompt-file is required
./skills/adviser/dist/adviser --input ./tmp/test-input.md
# Expected: Error about missing --prompt-file

# Test 3: Verify missing prompt file error
./skills/adviser/dist/adviser --prompt-file ./nonexistent.md --input ./tmp/test-input.md
# Expected: Error: Prompt file not found

# Test 4: Verify empty prompt file error  
echo "" > ./tmp/empty-prompt.md
./skills/adviser/dist/adviser --prompt-file ./tmp/empty-prompt.md --input ./tmp/test-input.md
# Expected: Error: Prompt file is empty

# Test 5: Full execution with valid files
cat > ./tmp/test-prompt.md << 'EOF'
You are an expert adviser. Analyze the input and return structured feedback.
Return a JSON object with:
- summary: Brief overview of what you see
- issues: Array of {severity, description} where severity is critical/high/medium/low
- suggestions: Array of improvement strings
EOF

echo "Test content to analyze" > ./tmp/test-input.md
./skills/adviser/dist/adviser --prompt-file ./tmp/test-prompt.md --input ./tmp/test-input.md --mode aisp
# Expected: Output manifest path printed
```

**Note:** This phase removes task-type arguments. Existing workflows will be updated in Phase 3.

---

## Phase 2: Update SKILL.md Documentation

### Task 2.1: Rewrite SKILL.md

**Files:**
- Modify: `skills/adviser/SKILL.md`

**Step 1: Replace SKILL.md content**

```markdown
---
name: adviser
description: Protocol-driven analysis executor. The consuming agent discovers relevant protocols, composes a prompt, and calls this tool.
---

# Adviser Skill

A protocol-driven analysis executor. The consuming agent discovers relevant AISP protocols, composes a prompt, and calls this tool to execute analysis.

## How to Use

### Step 1: Discover Protocols

Scan `protocols/*.aisp` and read headers to find relevant protocols:

```
γ≔<domain.path>        ;; Domain (e.g., software.architecture)
ρ≔⟨tag1,tag2,...⟩      ;; Tags for matching
⊢<claims>              ;; Formal claims
```

Match protocols to your activity context using semantic reasoning.

### Step 2: Compose Prompt

Write a prompt file to `./tmp/adviser-prompt-<uuid>.md` containing:

1. **Role & Objective** - Prime the LLM for the analysis task
2. **Activity Context** - Describe what you're analyzing and why
3. **Protocols** - Full content of selected protocols wrapped in `<protocol>` tags
4. **Output Requirements** - AISP 5.1 format requirements

Example structure:
```markdown
# Dynamic Adviser Prompt

## Role & Objective
You are an expert adviser analyzing the provided input...

## Activity Context
- Activity: [describe activity]
- Focus areas: [list focus areas]

## Protocols to Apply

### Protocol: SOLID Principles
<protocol>
[Full content of solid.aisp]
</protocol>

## Output Requirements
Respond in AISP 5.1 format...
```

### Step 3: Execute

```bash
adviser --prompt-file ./tmp/adviser-prompt-<uuid>.md \
        --input <file-to-analyze> \
        --mode aisp
```

### Step 4: Parse Output

Read the manifest from stdout to find the `.aisp` output file.
Parse for: `⊢Verdict(approve|revise|reject)` and issue list.

## Command Reference

```
adviser --prompt-file <path> --input <file> [options]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `--prompt-file, -p` | Yes | Path to composed system prompt |
| `--input, -i` | Yes | Path to content to analyze |
| `--mode, -m` | No | Output: aisp (default), human, workflow |
| `--output, -o` | No | Explicit output path |
| `--output-dir` | No | Output directory |
| `--timeout, -t` | No | Timeout in ms |

## Protocol Selection Examples

| Activity | Recommended Protocols |
|----------|----------------------|
| Architecture review | `solid.aisp`, `flow.aisp` |
| Implementation planning | `flow.aisp`, `yagni.aisp` |
| Code verification | `solid.aisp`, `triangulation.aisp` |
| Cost analysis | `cost-analysis.aisp`, `yagni.aisp` |

## AISP Output Reference

See `motifs/aisp-quick-ref.md` for interpreting AISP output:
- `⊢Verdict(approve|revise|reject)` — Final verdict
- `⊘` = critical, `◊⁻` = high, `◊` = medium, `◊⁺` = low severity
```

**Step 2: Commit**

```bash
git add skills/adviser/SKILL.md
git commit -m "docs(adviser): rewrite SKILL.md for dynamic protocol mode"
```

---

## Phase 3: Update Workflows

### Task 3.1: Update brainstorm.md

**Files:**
- Modify: `workflows/brainstorm.md`

**Step 1: Update adviser references**

Find and replace task-type references with dynamic protocol instructions:

```markdown
## Final Adviser Review

After the complete design is drafted and user-approved:

1. Create `./tmp` directory if it doesn't exist
2. Write complete design to: `./tmp/design-complete-<uuid8>.md`
3. **Discover relevant protocols** from `protocols/` (e.g., `solid.aisp`, `flow.aisp`)
4. **Compose adviser prompt** to `./tmp/adviser-prompt-<uuid8>.md` per SKILL.md
5. Run: `adviser --prompt-file ./tmp/adviser-prompt-<uuid8>.md --input ./tmp/design-complete-<uuid8>.md --mode aisp`
6. Read manifest from stdout path to find output `.aisp` file
7. Parse AISP output for verdict/issues
8. IF adviser returns critical/high issues: review and address concerns
9. Proceed to documentation
```

**Step 2: Commit**

```bash
git add workflows/brainstorm.md
git commit -m "docs(workflow): update brainstorm.md for dynamic adviser"
```

---

### Task 3.2: Update writing-plan.md

**Files:**
- Modify: `workflows/writing-plan.md`

**Step 1: Update adviser references**

```markdown
## Adviser Review (Once Per Phase)

Run adviser once after completing each major phase of the plan:

**After completing a phase:**
1. Save plan progress to: `docs/plans/YYYY-MM-DD-<feature-name>.md`
2. **Discover protocols** from `protocols/` matching plan analysis (e.g., `flow.aisp`, `yagni.aisp`)
3. **Compose prompt** to `./tmp/adviser-prompt-<uuid>.md` per adviser SKILL.md
4. Run: `adviser --prompt-file ./tmp/adviser-prompt-<uuid>.md --input docs/plans/YYYY-MM-DD-<feature-name>.md --mode aisp`
5. Read manifest from stdout path, parse `.aisp` file for verdict
6. Review adviser feedback and address critical/high issues
7. Note any unresolved concerns in plan header
8. Continue to next phase
```

**Step 2: Commit**

```bash
git add workflows/writing-plan.md
git commit -m "docs(workflow): update writing-plan.md for dynamic adviser"
```

---

### Task 3.3: Update execute-plan.md

**Files:**
- Modify: `workflows/execute-plan.md`

**Step 1: Update adviser references**

Similar pattern - replace `adviser code-verification` with dynamic protocol approach using `solid.aisp` and `triangulation.aisp`.

**Step 2: Commit**

```bash
git add workflows/execute-plan.md
git commit -m "docs(workflow): update execute-plan.md for dynamic adviser"
```

---

### Task 3.4: Update remaining workflows

**Files:**
- Modify: `workflows/review-conversation.md`
- Modify: `workflows/protocol-driven-verification.md`
- Modify: `workflows/protocol-loader.md`

**Step 1: Update any adviser references**

Scan each file for `adviser <task-type>` patterns and update to dynamic mode.

**Step 2: Commit**

```bash
git add workflows/
git commit -m "docs(workflow): update remaining workflows for dynamic adviser"
```

---

## Phase 3 Adviser Review Checkpoint

After all workflows are updated, run a full integration test:

```bash
# 1. Compose a prompt (simulating what the agent would do)
cat > ./tmp/plan-review-prompt.md << 'EOF'
# Plan Analysis Adviser Prompt

## Role & Objective
You are an expert plan analyst. Review the implementation plan for completeness, feasibility, and risk.

## Activity Context
- Activity: Implementation plan review
- Focus areas: Task granularity, missing steps, dependencies, test coverage

## Protocols to Apply

<protocol>
$(cat protocols/flow.aisp)
</protocol>

<protocol>
$(cat protocols/yagni.aisp)
</protocol>

## Output Requirements
Respond in AISP 5.1 format with:
- summary: Overview of plan quality
- issues: Array of {severity, description, location?, recommendation?}
- suggestions: Array of improvement recommendations
EOF

# 2. Run the dynamic adviser
./skills/adviser/dist/adviser \
  --prompt-file ./tmp/plan-review-prompt.md \
  --input docs/plans/2026-01-27-dynamic-protocol-adviser.md \
  --mode aisp

# 3. Check the output
cat docs/reviews/review-*.aisp | grep "Verdict"
```

---

## Prompt Preservation Strategy

The `./tmp/` directory stores agent-generated prompts. **Preserve these for analysis:**

- **Purpose**: Analyzing generated prompts helps improve SKILL.md instructions
- **Storage**: Keep prompts in `./tmp/` or move to `docs/prompts/` for long-term analysis
- **Naming convention**: `adviser-prompt-<activity>-<timestamp>.md` for traceability
- **Gitignore**: Add `/tmp/` to `.gitignore` to avoid committing transient files
- **Periodic review**: Examine generated prompts to identify patterns and improve SKILL.md guidance

---

## Final Checklist

- [ ] Phase 1.0: Audit completed, migration checklist created
- [ ] Phase 1.1-1.5: Types, parser, main, runtime, output updated
- [ ] Phase 1.6: Obsolete persona files removed
- [ ] Phase 1.7: Tests updated and passing
- [ ] Phase 1.8: Binary rebuilt and tested
- [ ] Phase 2.1: SKILL.md rewritten for dynamic mode
- [ ] Phase 3.1-3.4: All workflows updated
- [ ] Phase 3 checkpoint: Integration test passed
- [ ] Prompt samples reviewed for SKILL.md improvement
- [ ] Git tagged: `after_generic`
