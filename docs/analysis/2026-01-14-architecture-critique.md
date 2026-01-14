# Architecture Critique: Advisor Skill Implementation

**Date:** 2026-01-14  
**Analysis Scope:** Current implementation plan vs. Agent SDK capabilities

---

## Executive Summary

The plan has addressed several critical issues from the initial review, but **the fundamental architecture remains unnecessarily complex**. By shelling out to the Claude Code CLI instead of using the Agent SDK directly, the implementation adds layers of indirection, potential failure points, and maintenance burden.

**Key Finding:** The Agent SDK provides everything this skill needs: direct programmatic access, structured outputs, and type safety. Spawning a CLI subprocess is an anti-pattern in modern agent development.

---

## What Was Fixed

| Issue | Status | Change Made |
|-------|--------|-------------|
| Non-existent CLI flag | ✅ Fixed | Replaced `--dangerously-skip-permissions` with `--allowedTools all` |
| Missing skill descriptor | ✅ Added | Created `.claude-skill.json` (01-project-setup.md:37-66) |
| Unstructured workflow output | ✅ Fixed | Returns JSON structure (03-cli-engine.md:83-93) |
| No binary detection | ✅ Added | Uses `which()` check (03-cli-engine.md:14-18) |
| Hardcoded paths | ✅ Partial | Added `ADVISOR_OUTPUT_DIR` env var (03-cli-engine.md:107) |
| Input validation | ✅ Added | Length check and persona enum validation (04-cli-interface.md:27-31) |
| Prompt injection protection | ✅ Added | XML-style delimiters (04-cli-interface.md:43-45) |
| No tests | ✅ Added | Unit tests for prompt loader (02-core-logic.md:102-139) |

---

## Critical Issue: Wrong Tool for the Job

### Current Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────┐
│ Antigravity │ ───▶ │   Bun       │ ───▶ │  claude CLI  │ ───▶│  Claude  │
│  (Host)     │     │   Script    │     │  (subprocess) │     │   API    │
└─────────────┘     └─────────────┘     └──────────────┘     └─────────┘
                           │                                    │
                           └──────────────────────────────────────┘
                                            │
                                            │ stdout/stderr
                                            │ (string parsing)
                                   ┌────────┴────────┐
                                   │ JSON extraction │
                                   │ & parsing       │
                                   └─────────────────┘
```

### Recommended Architecture (Agent SDK)

```
┌─────────────┐     ┌──────────────────────────────────┐     ┌─────────┐
│ Antigravity │ ───▶ │    @anthropic-ai/claude-agent-sdk│ ───▶│  Claude  │
│  (Host)     │     │         (direct connection)      │     │   API    │
└─────────────┘     └──────────────────────────────────┘     └─────────┘
                           │
                           │ Type-safe Response
                           │ (structured_output)
                    ┌──────┴───────────────────────┐
                    │ No parsing, no subprocess    │
                    │ No stdout, no stderr         │
                    └─────────────────────────────┘
```

---

## Detailed Comparison

### 1. Executor Implementation

#### Current Plan (CLI Spawn)
```typescript
// 03-cli-engine.md:14-65
export async function executeClaude(prompt: string, timeoutMs: number): Promise<string> {
  // ❌ Binary detection
  const claudePath = await which('claude');
  if (!claudePath) throw new Error('Claude not found');
  
  // ❌ Process spawning
  const proc = Bun.spawn(['claude', '--print', '--allowedTools', 'all', '-p', prompt], ...);
  
  // ❌ Complex timeout handling
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    proc.exited.then(() => clearTimeout(timer));
  });
  
  // ❌ Stdout/stderr text extraction
  const executionPromise = proc.exited.then(async (code) => {
    if (code !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`Claude exited with code ${code}: ${stderr}`);
    }
    return await new Response(proc.stdout).text();
  });
  
  return await Promise.race([executionPromise, timeoutPromise]);
}
```

**Problems:**
- ~50 lines of process management code
- Depends on external binary in PATH
- Environment variable forwarding complexity
- Timeout race conditions
- No structured output (just string)
- Manual error code interpretation

#### Recommended (Agent SDK)
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const AnalysisResult = z.object({
  summary: z.string(),
  issues: z.array(z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    location: z.string().optional(),
    recommendation: z.string().optional()
  })),
  suggestions: z.array(z.string())
});

async function executeClaude(
  systemPrompt: string,
  context: string,
  timeoutMs: number
): Promise<z.infer<typeof AnalysisResult>> {
  const schema = zodToJsonSchema(AnalysisResult, { $refStrategy: 'root' });
  let result: z.infer<typeof AnalysisResult> | null = null;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  const queryPromise = (async () => {
    const prompt = `${systemPrompt}\n\nCONTEXT:\n${context}`;
    
    for await (const message of query({
      prompt,
      options: {
        outputFormat: {
          type: 'json_schema',
          schema
        }
      }
    })) {
      if (message.type === 'result' && message.structured_output) {
        const parsed = AnalysisResult.safeParse(message.structured_output);
        if (parsed.success) {
          result = parsed.data;
        }
      }
    }
    
    if (!result) throw new Error('No result received');
    return result;
  })();
  
  return await Promise.race([queryPromise, timeoutPromise]);
}
```

**Benefits:**
- ~30 lines (40% reduction)
- No subprocess, no binary dependency
- **Structured output guaranteed by SDK**
- Built-in error handling
- Type-safe throughout
- Environment handled by SDK

---

### 2. Output Handling

#### Current Plan (Manual JSON Wrapping)
```typescript
// 03-cli-engine.md:83-106
if (mode === 'workflow') {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    persona: type,
    content: content,
    isCritical: content.toLowerCase().includes('critical issue') || 
                content.toLowerCase().includes('must fix')
  }, null, 2);
}
```

**Problems:**
- String parsing for critical detection (brittle)
- No schema validation
- Wrapper around raw text content
- LLM output format dependent (not guaranteed)

#### Recommended (Native Structured Output)
```typescript
// With Agent SDK, structured output is native
// No wrapper needed - the result IS the structured output
if (mode === 'workflow') {
  return result; // Already type-safe AnalysisResult
}
```

---

### 3. Prompt Management

#### Current Plan
```typescript
// 02-core-logic.md:73-82
import architectPrompt from './prompts/architect.txt' with { type: 'text' };
import strategistPrompt from './prompts/strategist.txt' with { type: 'text' };
import auditorPrompt from './prompts/auditor.txt' with { type: 'text' };

const PROMPT_MAP: Record<PersonaType, string> = {
  'design-review': architectPrompt,
  'plan-analysis': strategistPrompt,
  'code-verification': auditorPrompt
};
```

**This is fine** - Agent SDK accepts prompts the same way.

However, we could improve by using the SDK's system prompt capability directly:

```typescript
for await (const message of query({
  prompt: context,
  system: getPersonaPrompt(taskType),
  options: { outputFormat: { type: 'json_schema', schema } }
})) { ... }
```

---

### 4. Configuration & Dependencies

#### Current Plan Requirements
- Bun runtime
- Claude Code CLI binary in PATH
- Multiple environment variables (ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL, etc.)
- Binary installation instructions for users

#### Recommended With Agent SDK
- Bun runtime (or Node.js)
- Single dependency: `@anthropic-ai/claude-agent-sdk`
- Single env var: `ANTHROPIC_API_KEY`
- Standard npm/bun install

---

## Remaining Issues in Current Plan

### 1. Antigravity Skill Definition Format

**Status:** Unknown

The `.claude-skill.json` format (01-project-setup.md:37-66) appears to be a guess. The actual Antigravity skill format could not be verified from the provided documentation.

**Risk:** If this format is incorrect, the skill won't be discoverable.

**Action Required:** Obtain actual Antigravity skill specification.

### 2. Prompt Content Still Markdown-Based

**Status:** Inefficient

The prompts still ask for markdown output:
```txt
// 02-core-logic.md:28
Output in markdown with clear headings.
```

**Problem:** With Agent SDK structured outputs, we should define the schema requirements in the prompt instead of asking for markdown format.

**Better:**
```txt
You are the Architect, an expert design critic. 
Your role is to analyze design documentation and return a structured analysis.

Provide:
1. A concise summary of findings
2. Critical issues that must be addressed before implementation
3. Edge cases and failure scenarios
4. Scalability concerns
5. Logical gaps or missing requirements
6. Recommended improvements

Be specific and reference exact sections of the design document.
```

Let the schema enforce the structure.

### 3. Test File Integration

**Status:** Incomplete

The `test-run.ts` script (04-cli-interface.md:84-91) tries to spawn the script again, which doesn't work well with Agent SDK's async generator.

**Better:** Direct test file:
```typescript
// skills/adviser/adviser.test.ts
import { expect, test, describe } from "bun:test";
import { executeClaude } from "./executor";

describe("Advisor Integration", () => {
  test(timeout: 30000, async () => {
    const result = await executeClaude(
      "You are a test assistant. Return a simple summary.",
      "Test input",
      10000
    );
    
    expect(result).toHaveProperty('summary');
    expect(result.summary).toBeTruthy();
  });
});
```

### 4. Binary Compilation Still Present

**Status:** Redundant

The packaging section (05-packaging.md:14-35) still includes binary compilation scripts.

**Problem:** With Agent SDK, you compile the skill with Bun, but you don't need standalone binaries for Antigravity integration. The skill runs as source.

**Clarification:** Remove standalone binary scripts or clarify they're only for non-Antigravity usage.

---

## Architecture Simplification Summary

| Aspect | Current (CLI) | Recommended (SDK) | Improvement |
|--------|---------------|-------------------|-------------|
| Lines of code | ~150 | ~80 | 47% reduction |
| External deps | 2 (Bun + CLI) | 1 (npm package) | 50% reduction |
| Runtime complexity | Subprocess management | Direct API calls | Major |
| Output format | Raw string + wrapper | Native structured | Type-safe |
| Error handling | Manual parsing | Built-in | Reliable |
| Maintenance | CLI version sensitive | SDK version only | Stable |
| Cross-platform needs | Binary compilation | None | Simplified |

---

## Proposed Revised Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Antigravity                                │
│                      (Host Environment)                          │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          │ Invokes via .claude-skill.json
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                   skills/adviser/index.ts                        │
│                                                                  │
│  1. Parse taskType, mode, context                               │
│  2. Get persona system prompt                                   │
│  3. Call Agent SDK with structured output schema                │
│  4. Return result (JSON for workflow, file for human)           │
│                                                                  │
│  Dependencies:                                                   │
│  - @anthropic-ai/claude-agent-sdk                               │
│  - zod + zod-to-json-schema                                      │
│  - Local prompt files (architect.txt, etc.)                    │
└──────────────┬───────────────────────────────────────────────────┘
               │
               │ Direct API call (no subprocess)
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Anthropic API                                 │
│                                                                  │
│  - Returns structured JSON matching Zod schema                   │
│  - Type-safe response                                            │
│  - Built-in validation                                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## Recommended Implementation Plan (Simplified)

### New File Structure
```
skills/adviser/
├── index.ts           # Entry point (from Antigravity)
├── executor.ts        # Agent SDK integration (simplified)
├── outputs.ts         # File/routing logic
├── prompts.ts         # Persona prompt registry
├── schemas.ts         # Zod schemas for structured outputs
├── types.ts           # TypeScript types
├── prompts/
│   ├── architect.txt
│   ├── strategist.txt
│   └── auditor.txt
├── adviser.test.ts    # Integration tests
└── .claude-skill.json # Antigravity registration
```

### Modified Dependencies
```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "latest",
    "zod": "latest",
    "zod-to-json-schema": "latest"
  }
}
```

### Key Changes

1. **Remove:** `cli.ts` - no longer needed, `index.ts` is the entry point
2. **Replace:** `executor.ts` - use Agent SDK `query()` instead of `Bun.spawn()`
3. **Add:** `schemas.ts` - define Zod schemas for each persona
4. **Modify:** `outputs.ts` - remove JSON wrapping, use native structured output
5. **Remove:** Binary compilation scripts - not needed for Antigravity skills
6. **Update:** Prompts - remove markdown output requirements

---

## Decision Matrix

| Factor | CLI Approach | Agent SDK | Winner |
|--------|--------------|-----------|--------|
| Simplicity | Low (subprocess) | High (direct API) | SDK |
| Type Safety | None | Full | SDK |
| Structured Output | Manual (heuristic) | Native | SDK |
| Reliability | Medium (ext. binary) | High (npm package) | SDK |
| Maintenance | Track CLI changes | Track SDK only | SDK |
| Testing Complexity | High (mock spawn) | Medium (mock SDK) | SDK |
| Bundle Size | Smaller | Larger | CLI |
| Dependencies | External binary | npm package | Tie |
| Documentation | Mature | Growing | CLI |
| Tool Autonomy | Full | Full | Tie |

**Overall Winner: Agent SDK**

The CLI approach provides minimal advantages (slightly smaller bundle) while the SDK offers significant benefits in reliability, type safety, and maintainability.

---

## Conclusion

The current plan shows improvements from the initial review, but the fundamental architecture choice (CLI subprocess vs Agent SDK) represents an **opportunity for major simplification**.

**Recommendation:** Rewrite the executor to use Agent SDK. This will:
1. Cut code by ~40%
2. Eliminate external dependency on Claude CLI binary
3. Provide native structured outputs
4. Enable full type safety
5. Simplify testing
6. Reduce maintenance burden

**Priority Actions:**
1. **High Priority:** Rewrite `executor.ts` using Agent SDK
2. **High Priority:** Add `schemas.ts` with Zod definitions
3. **Medium Priority:** Verify `.claude-skill.json` format with Antigravity docs
4. **Medium Priority:** Remove/reduce binary compilation documentation
5. **Low Priority:** Refine prompt templates for schema-based outputs

---

## Appendix: Sample Complete SDK Implementation

```typescript
// skills/adviser/schemas.ts
import { z } from 'zod';

export const AnalysisSchema = z.object({
  timestamp: z.string().datetime(),
  persona: z.enum(['design-review', 'plan-analysis', 'code-verification']),
  summary: z.string(),
  issues: z.array(z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    location: z.string().optional(),
    recommendation: z.string().optional()
  })),
  suggestions: z.array(z.string())
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;
```

```typescript
// skills/adviser/executor.ts
import { query } from '@anthropic-ai/claude-agent-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { AnalysisResult } from './schemas';

export async function analyze(
  systemPrompt: string,
  context: string,
  timeoutMs: number = 60000
): Promise<AnalysisResult> {
  const schema = zodToJsonSchema(AnalysisSchema, { $refStrategy: 'root' });
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  
  const queryPromise = (async (): Promise<AnalysisResult> => {
    const fullPrompt = context 
      ? `${systemPrompt}\n\nCONTEXT:\n${context}`
      : systemPrompt;
    
    for await (const message of query({
      prompt: fullPrompt,
      system: systemPrompt,  // SDK handles system prompts cleanly
      options: {
        outputFormat: {
          type: 'json_schema',
          schema
        }
      }
    })) {
      if (message.type === 'result' && message.structured_output) {
        const parsed = AnalysisSchema.safeParse(message.structured_output);
        if (parsed.success) {
          return parsed.data;
        }
        throw new Error(`Invalid schema: ${JSON.stringify(parsed.error)}`);
      }
    }
    
    throw new Error('No result received from Claude');
  })();
  
  return await Promise.race([queryPromise, timeoutPromise]);
}
```

```typescript
// skills/adviser/outputs.ts
import { write } from 'bun';
import { join } from 'node:path';
import type { OutputMode, PersonaType } from './types';
import type { AnalysisResult } from './schemas';

export async function handleOutput(
  result: AnalysisResult,
  mode: OutputMode,
  type: PersonaType
): Promise<string> {
  if (mode === 'workflow') {
    return JSON.stringify(result, null, 2);
  }
  
  // Convert structured result to human-readable markdown
  const filename = `review-${type}-${Date.now()}.md`;
  const baseDir = process.env.ADVISOR_OUTPUT_DIR || 'docs/reviews';
  const path = join(process.cwd(), baseDir, filename);
  
  // Convert issues to markdown
  let markdown = `# ${type.replace(/-/g, ' ').toUpperCase()} Review\n\n`;
  markdown += `**Date:** ${new Date(result.timestamp).toISOString()}\n\n`;
  markdown += `## Summary\n\n${result.summary}\n\n`;
  
  if (result.issues.length > 0) {
    markdown += `## Issues (${result.issues.length})\n\n`;
    for (const issue of result.issues) {
      const emoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
      }[issue.severity];
      markdown += `### ${emoji} ${issue.severity.toUpperCase()}\n`;
      markdown += `${issue.description}\n`;
      if (issue.location) markdown += `**Location:** ${issue.location}\n`;
      if (issue.recommendation) markdown += `**Recommendation:** ${issue.recommendation}\n`;
      markdown += '\n';
    }
  }
  
  if (result.suggestions.length > 0) {
    markdown += '## Suggestions\n\n';
    for (const suggestion of result.suggestions) {
      markdown += `- ${suggestion}\n`;
    }
  }
  
  const fs = await import('node:fs/promises');
  await fs.mkdir(join(process.cwd(), baseDir), { recursive: true });
  await Bun.write(path, markdown);
  
  return `Review saved to: ${path}`;
}
```

This is the complete, simplified architecture using Agent SDK.
