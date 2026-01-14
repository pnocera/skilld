# Plan Compliance Report

**Date:** 2026-01-14  
**Purpose:** Verify if the modified plan adheres to critical analysis recommendations

---

## Executive Summary

**Overall Status:** 8/12 recommendations implemented (67% compliance)

The plan has made **substantial improvements** by adopting the Agent SDK architecture. However, **critical bugs and architectural gaps remain** that will cause implementation failures.

---

## Recommendation Tracker

| # | Recommendation | Status | Details |
|---|----------------|--------|---------|
| 1 | Use Agent SDK instead of CLI | ✅ **Implemented** | `03-cli-engine.md:14` uses `@anthropic-ai/claude-agent-sdk` |
| 2 | Add Zod schemas | ✅ **Implemented** | `01-project setup.md:92-116` defines `AnalysisSchema` |
| 3 | Simplify executor | ✅ **Implemented** | Code reduced from ~50 to ~40 lines, direct API calls |
| 4 | Remove binary dependency | ✅ **Implemented** | `05-packaging.md:23` confirms CLI not required |
| 5 | Native structured output | ✅ **Implemented** | `03-cli-engine.md:47-53` uses `message.structured_output` |
| 6 | Type-safe throughout | ✅ **Implemented** | `AnalysisResult` type inferred from Zod schema |
| 7 | Built-in error handling | ✅ **Implemented** | `safeParse` validation with detailed error reporting |
| 8 | Remove JSON wrapping | ✅ **Implemented** | `output.ts:82-84` directly returns schema-based result |
| 9 | Update prompts for schema | - **Partial** | Markdown removed but still vague about structure |
| 10 | Verify Antigravity format | ❌ **Outstanding** | `.claude-skill.json` still unverified |
| 11 | Binary scripts clarifications | ⚠️ **Clarified** | Marked optional for Antigravity users |
| 12 | Test file integration | ✅ **Implemented** | `adviser.test.ts` directly tests executor |

---

## Critical Issues Found

### 1. **NEW BUG: Prompt Template Syntax Error**

**Location:** `02-core logic.md:13-26`

**Current Code:**
```typescript
**Step 1: Architect Persona**
You are the Architect, an expert design critic. Your role is to analyze design
documentation and return a structured analysis.
...
```

**Problem:** The prompt file content is **not enclosed in backticks**. This will cause the prompt file to be created as raw text with markdown formatting, not as ASCII art. The template content lacks proper delimitation.

**Expected Format:**
```text
You are the Architect, an expert design critic. Your role is to analyze design
documentation and return a structured analysis.

Provide:
...
```

**Impact:** The generated prompt files will contain incorrect content, breaking all three personas.

**Required Fix:** Add ```text``` delimiters to all three prompt templates. Also applies to `strategist.txt:29-43` and `auditor.txt:46-60`.

---

### 2. **ARCHITECTURAL BUG: Schema Mismatch on Persona Field**

**Location:** `01-project setup.md:102-105` vs `03-cli-engine.md:37-39`

**The Schema expects:**
```typescript
persona: z.enum(['design-review', 'plan-analysis', 'code-verification'])
```

**The Executor sends:**
```typescript
query({
  prompt: fullPrompt,    // <context>...</context>
  system: systemPrompt,  // The persona template
  options: { outputFormat: ... }
})
```

**Problem:** The schema requires Claude to return a `persona` field with the exact string value. **Claude has not been instructed to include this field.** The schema validation will fail because:
1. The `persona` field is required in `AnalysisSchema`
2. Client-side code never injects this value
3. Claude doesn't know to include it unless explicitly instructed in the prompt

**Potential Outcomes:**
- **Most likely:** Schema validation fails → `safeParse` error → user sees cryptic error
- **If it somehow works:** The value is whatever hallucinates, won't match actual taskType

**Required Fix:** Either:
- **Option A:** Add persona injection client-side (modify schema to make persona optional, then inject after parsing)
- **Option B:** Add explicit instruction in prompts: "Include 'persona': '<persona-type>' in the structured output"
- **Option C:** Remove persona from schema (if not needed by Antigravity)

**Recommended:** Option A - client-side injection for reliability

---

### 3. **ARCHITECTURAL BUG: Timestamp Field Source**

**Location:** `01-project setup.md:103`

**Current Schema:**
```typescript
timestamp: z.string().datetime()
```

**Problem:** Who sets this timestamp?
- **Option 1:** Claude generates it → Unreliable, timezone issues, wasted tokens
- **Option 2:** Client sets it → Not currently doing this anywhere

**Current Flow:**
``Claude returns JSON → safeParse checks timestamp field if present`

**Issue:** If Claude doesn't include a correctly-formatted ISO datetime, validation fails.

**Required Fix:** Either:
- **Option A:** Remove timestamp from required fields, inject client-side after successful parse
- **Option B:** Add explicit prompt instruction for exact format (wastes tokens)
- **Option C:** Add post-processing step to inject timestamp before returning

**Recommended:** Option C - client-side injection for consistency

---

### 4. **REVISIT: Missing Input Validation**

**Location:** `04-cli_interface.md:13-64`

**Current State:** The 50,000 character limit check **has been removed** compared to the previous iteration.

**Problem:** Large inputs can:
- Exceed Claude's context window limits (varies by model)
- Cause API errors mid-stream
- Waste API credits for truncated results

**Code Gap:** No validation anywhere:
```typescript
const context = args[2] || '';
// ❌ No length check
const analysisResult = await executeClaude(systemPrompt, context, timeout);
```

**Required Fix:** Re-add input validation:
```typescript
if (context.length > 50000) {
  console.error('Context too large. Please limit input to 50,000 characters.');
  process.exit(1);
}
if (context.length === 0 && taskType !== 'design-review') {
  console.error('Context required for this analysis type.');
  process.exit(1);
}
```

---

### 5. **MEDIUM: Empty Context Handling**

**Location:** `03-cli_engine.md:33-35`

**Current Code:**
```typescript
const fullPrompt = context 
  ? `<context>\n${context}\n</context>`
  : "Please perform the analysis based on the system instructions.";
```

**Problem:** Sending "Please perform the analysis..." as the user prompt:
- Wastes API credits for a non-productive request
- The system prompt alone should be sufficient for persona-based queries
- Result will be trivial/unuseful

**Question:** When would this path be taken?
- If `context` param is empty string or not provided
- Design review with no design document
- Plan analysis with no plan
- Code verification with no code

**Required Decision:** Either:
- **Option A:** Empty context should be an error (most practical)
- **Option B:** Accept empty only for design-review (preview mode)
- **Option C:** Keep current behavior and document as "preview mode"

**Recommended:** Option A - reject empty context for all types

---

### 6. **MEDIUM: Test Timeout Too Short**

**Location:** `04-cli_interface.md:87`

**Current Code:**
```typescript
}, 35000);  // Test timeout
```

**But the executor call uses:**
```typescript
executeClaude(..., 30000);  // 30 second timeout
```

**Problem:** Test timeout (35s) is barely larger than executor timeout (30s). Any network latency will cause flaky tests.

**Recommended:** Make test timeout 2x executor timeout for safety:
```typescript
}, 60000);  // 60 seconds
```

---

### 7. **LOW: Test Requires API Key**

**Location:** `04-cli_interface.md:74`

**Comment states:**
```typescript
// Note: Requires ANTHROPIC_API_KEY to be set
```

**Problem:** This means the test will fail for:
- CI/CD without credentials
- New developers without key
- PR validation environments

**Recommended:** Either:
- **Option A:** Skip test if no API key
- **Option B:** Add mock test for prompt loader (already exists)
- **Option C:** Document clearly as integration-only test

**Quick Fix:**
```typescript
test.skip(!process.env.ANTHROPIC_API_KEY, "Mocked test - requires API key", async () => {
  // ...
});
```

---

## Outstanding Concerns (Unresolved)

### 1. Antigravity Skill Format

**Status:** Still Unverified

The `.claude-skill.json` structure at `01-project setup.md:42-74` was **not verifiable** in the original analysis and **remains unverified** now.

**Questions:**
- Is `"entry": "./index.ts"` the correct field?
- Are parameter types (`enum`, `string`, `number`) recognized?
- Does Antigravity support skill registration via JSON at all?

**Impact:** If format is incorrect, skill won't be discoverable in Antigravity regardless of implementation quality.

**Action Required:** Obtain actual Antigravity skill registration documentation or contact Antigravity support.

---

### 2. Antigravity Integration Protocol

**Status:** Not Documented

**Gap:** How exactly does Antigravity call the skill?

**Unknowns:**
- Does Antigravity call `index.ts` directly as a function exported?
- Does it spawn the script as a subprocess with args?
- Does it use some IPC mechanism?

**Current Entry Point (04-cli interface.md:19-64):**
- Uses `process.argv` for CLI-style argument parsing
- Calls `process.exit()` explicitly
- Designed for direct script execution

**Potential Mismatch:** If Antigravity imports the skill as a module, `process.argv` and `process.exit` behavior is incorrect.

**Required Clarification:** Integration protocol from Antigravity documentation.

---

## Comparison: Before vs After Analysis

### Code Reduction

| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| Executor | ~50 lines (spawn) | ~40 lines (SDK) | **20%** |
| Output Handler | ~25 lines | ~50 lines | **-100%** (more features) |
| Entry Point | ~65 lines | ~45 lines | **31%** |
| **Total Core Logic** | **~140 lines** | **~135 lines** | **~3.5%** |

**Observation:** Overall reduction is **not as substantial as predicted** (~47% predicted vs ~6.5% actual). Reason: Output handler gained markdown conversion logic at the cost of code reduction elsewhere.

**Note:** The complexity reduction (no subprocess management) is still valuable even if raw line count didn't drop as much.

---

### Dependency Comparison

| Before | After |
|--------|-------|
| Bun | Bun |
| Claude CLI binary | `@anthropic-ai/claude-agent-sdk` |
| 4+ env vars | 1 env var |

**Result:** Net improvement in dependency management.

---

## Verdict on Analysis Compliance

### High-Priority Issues (Must Fix)

| Issue | Severity | Plan Addressed? |
|-------|----------:|-----------------:|
| CLI spawn replaced with SDK | Critical | ✅ Yes |
| Zod schemas added | Critical | ✅ Yes |
| Native structured output | Critical | ✅ Yes |
| Prompt template syntax error | Critical | ❌ **NEW** |
| Schema persona field bug | Critical | ❌ **NEW** |
| Schema timestamp source | Critical | ❌ **NEW** |
| Missing input validation | Critical | ❌ **Regressed** |

### Medium-Priority Issues

| Issue | Severity | Plan Addressed? |
|-------|----------:|-----------------:|
| Empty context handling | Medium | ⚠️ Unclear |
| Test timeout too short | Medium | ⚠️ Needs fix |
| Test requires API key | Medium | ⚠️ Needs fix |
| Binary compilation clarified | Medium | ✅ Clarified |

### Low-Priority / Outstanding

| Issue | Severity | Plan Addressed? |
|-------|----------:|-----------------:|
| Antigravity format verified | Low | ❌ Unavailable |
| Antigravity protocol documented | Low | ❌ Unavailable |
| Prompts optimized for schema | Low | ⚠️ Partial |

---

## Recommended Fix Order

### Batch 1: Critical Implementation Breakers (Before Coding)

1. **Fix prompt template syntax** (02-core-logic.md)
   - Wrap all three prompt templates in ```text...\n```

2. **Resolve schema persona field** (01-project setup.md, 03-cli-engine.md)
   - Decide who controls the persona field
   - Implement client-side injection or prompt instruction

3. **Resolve schema timestamp source** (01-project setup.md, 03-cli-engine.md)
   - Implement client-side timestamp injection after parse

4. **Restore input validation** (04-cli_interface.md)
   - Re-add 50,000 character limit
   - Require context for all task types

### Batch 2: Before Deployment

5. **Clarify empty context policy**
   - Document decision or require context for all types

6. **Fix test timeout**
   - Increase from 35s to 60s

7. **Make test conditional**
   - Skip if API key not present

### Batch 3: Documentation

8. **Document Antigravity integration protocol**
   - Clarify skill invocation mechanism
   - Update entry point if needed

9. **Clarify Antigravity skill format**
   - Get official documentation
   - Update `.claude-skill.json` if needed

---

## Critical Code Fix Examples

### Fix 1: Prompt Template Syntax

**Change `02-core_logic.md:13-26`:**
```diff
**Step 1: Architect Persona**
+ ```text
You are the Architect, an expert design critic. Your role is to analyze design
documentation and return a structured analysis.

Provide:
1. A concise summary of findings
2. Critical issues that must be addressed before implementation
3. Edge cases and failure scenarios
4. Scalability concerns
5. Logical gaps or missing requirements
6. Recommended improvements

Be specific and constructively reference exact sections of the document.
+ ```
```

### Fix 2: Schema Persona Field

**Option A Recommended - Client-side injection:**

**Modify `01-project setup.md:102-113`:**
```diff
export const AnalysisSchema = z.object({
- timestamp: z.string().datetime(),
- persona: z.enum(['design-review', 'plan-analysis', 'code-verification']),
  summary: z.string(),
  issues: z.array(z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    location: z.string().optional(),
    recommendation: z.string().optional()
  }))
- }).transform(data => ({
-   ...data,
-   timestamp: data.timestamp || new Date().ISOString(), // Optional client-side
- }));
+ });
```

**Modify `03-cli_engine.md:45-57`:**
```diff
  if (message.type === 'result' && message.structured_output) {
    const parsed = AnalysisSchema.safeParse(message.structured_output);
    if (parsed.success) {
+     const result: AnalysisResult = {
+       ...parsed.data,
+       timestamp: new Date().ISOString(),
+       persona: taskType // Need to pass taskType to executeClaude
+     };
      return result;
    }
    throw new Error(`Invalid schema returned: ${JSON.stringify(parsed.error)}`);
  }
}
```

**Modify `03-cli_engine.md:21-22`:**
```diff
export async function executeClaude(
  systemPrompt: string,
  context: string,
+ taskType: string, // New parameter
  timeoutMs: number = 60000
): Promise<AnalysisResult> {
```

### Fix 3: Input Validation

**Add to `04-cli interface.md:38-40`:**
```diff
  // 1. Validation
  const validTaskTypes = ['design-review', 'plan-analysis', 'code-verification'];
  if (!validTaskTypes.includes(taskType)) {
    console.error(`Invalid task type: ${taskType}.`);
    process.exit(1);
  }
+
+ if (context.length > 50000) {
+   console.error('Context too large. Maximum 50,000 characters allowed.');
+   process.exit(1);
+ }
+
+ if (context.length === 0) {
+   console.error('Context is required for analysis.');
+   process.exit(1);
+ }
```

**Modify `04-cli_interface.md:46`:**
```diff
    // 3. Execute via Agent SDK
-   const analysisResult = await executeClaude(systemPrompt, context, timeout);
+   const analysisResult = await executeClaude(systemPrompt, context, taskType, timeout);
```

---

## Conclusion

The plan now **correctly uses the Agent SDK** and **includes Zod schemas**, representing a significant architectural improvement over the CLI subprocess approach.

However, **critical bugs remain** that will cause immediate implementation failures:

1. **Prompt template syntax errors** - Will corrupt all prompt files
2. **Schema persona field mismatch** - Will cause validation failures  
3. **Timestamp handling unclear** - May cause validation failures
4. **Missing input validation** - Regressed from previous iteration

**Recommendation:** Do not proceed with implementation until Critical Fix Batch 1 is complete. The remaining issues can be refined during development, but the critical bugs must be fixed first.

**Score:** 8/12 recommendations implemented, **critical bugs remaining**
