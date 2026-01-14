# Plan Review: Streaming Mode & Compliance Check

**Date:** 2026-01-14  
**Review:** Modified plan verification and streaming mode analysis

---

## Executive Summary

**Overall Status:** All critical bugs from previous review have been fixed. Streaming mode is correctly implemented. However, **one new architectural concern** emerged regarding the Agent SDK's runtime dependency.

---

## Previous Critical Issues - Resolution Status

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| Prompt template syntax | ✅ **Fixed** | All three prompts now use proper ```text``` delimiters (02-core-logic.md) |
| Schema persona field | ✅ **Fixed** | Client-side injection implemented (03-cli-engine.md:47-52) |
| Schema timestamp source | ✅ **Fixed** | Client-side injection implemented (03-cli-engine.md:48) |
| Missing input validation | ✅ **Fixed** | 50K limit and required context (04-cli-interface.md:43-49) |
| Empty context handling | ✅ **Fixed** | Now rejects empty context (04-cli-interface.md:43-45) |
| Test timeout too short | ✅ **Fixed** | Changed to 60,000ms (04-cli-interface.md:90) |
| Test requires API key | ✅ **Fixed** | Conditional skip added (04-cli-interface.md:71-74) |

**Critical Bug Status:** RESOLVED - No remaining implementation blockers.

---

## Streaming Mode Analysis

### Current Implementation

**Location:** `03-cli_engine.md:37-56`

```typescript
const queryPromise = (async (): Promise<AnalysisResult> => {
  const fullPrompt = `<context>\n${context}\n</context>`;
  
  for await (const message of query({
    prompt: fullPrompt,
    system: systemPrompt,
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
        return {
          ...parsed.data,
          timestamp: new Date().toISOString(),
          persona: taskType
        };
      }
      throw new Error(`Invalid schema returned: ${JSON.stringify(parsed.error)}`);
    }
  }
  
  throw new Error('No result received from Claude');
})();
```

### Compliance with Streaming Mode Documentation

**The documentation states two modes:**

| Mode | Description | Use Case |
|------|-------------|----------|
| **Streaming Input Mode** | Persistent, interactive session with async generator | Recommended, full feature access |
| **Single Message Input** | One-shot queries using simple strings | Stateless, lambda functions |

**Current Implementation Analysis:**
- Uses `for await (const message of query({...}))` → **STREAMING MODE** ✓
- Passes `prompt` as a string, not async generator → **Effectively SINGLE MESSAGE** ✓
- Does not use `continue` option → Each query is stateless ✓

### Is This Correct?

**Answer:** Yes, for this use case.

**Reasoning:**

1. **The advisor skill is fundamentally single-message:**
   - User provides taskType + context
   - System generates analysis
   - Returns result
   - End of interaction
   - No follow-up questions expected
   - No conversation context needed

2. **Structured outputs require streaming mode:**
   - The SDK returns `structured_output` in `result` messages
   - This pattern is only available via the async iterator
   - Single message mode returns `result.result` (unstructured)
   - **We MUST use the async iterator pattern to get structured outputs**

3. **No streaming input features needed:**
   - No image attachments ✗
   - No queued messages ✗
   - No real-time interruption ✗
   - No hooks ✗

**Verdict:** The implementation is **correct** - it uses the streaming iterator for structured output retrieval, but effectively operates as single-message for the input pattern.

---

## New Critical Issue: Architectural Conflict

### Issue: Runtime Dependency Contradiction

**The plan states:**

**Location:** `01-project_setup.md:1-10` (Prerequisites section)
```markdown
### Prerequisites

- **Bun**: Runtime and package manager.
- **Claude Code CLI**: The Agent SDK uses Claude Code as its runtime. [Install instructions](https://code.claude.com/docs/en/setup).
- **Anthropic Account**: Activated and authenticated via `claude login`.
```

**Location:** `05-packaging.md:23` (Build note)
```markdown
NOTE: Since we are using the Agent SDK, the advisor executes via the Claude Code runtime. The `claude` CLI **must be installed and authenticated** on the system where the advisor runs.
```

**Location:** `04-cli_interface.md:20-25` (Runtime check)
```typescript
const claudePath = await which('claude');
if (!claudePath) {
  console.error('[Advisor] Error: Claude Code CLI (claude) not found. This is required by the Agent SDK.');
  process.exit(1);
}
```

### The Problem

**My previous analysis stated:**
> "Eliminate external binary dependency" ✓ (✅ Fixed)

**Reality:** The Agent SDK **REQUIRES** the Claude Code CLI to be installed. This is not an external binary that can be bundled - it's the runtime for the SDK itself.

### Verification from Documentation

From the Agent SDK overview:
> "The Agent SDK gives you the same tools, agent loop, and context management that power Claude Code."

From the streaming mode docs:
> Streaming input mode allows the agent to operate as a long lived process...persistent file system state...tools integration

This confirms: **The Agent SDK is a wrapper around Claude Code's runtime**, not a standalone library.

### Impact

| Previously Assumed | Actual Reality |
|-------------------|----------------|
| `npm install @anthropic-ai/claude-agent-sdk` → fully self-contained | **FALSE** |
| Only requires `ANTHROPIC_API_KEY` | **FALSE** - requires `claude` CLI installed |
| No Claude Code CLI needed | **FALSE** - CLM IS the runtime |
| Binary compilation removes external deps | **FALSE** - compiled binary still expects `claude` in PATH |

### Severity

**HIGH** - This changes the entire deployment story:

1. **Compilation Issue:** `bun build --compile` will fail to include `claude` binary
2. **Distribution Issue:** Binary distribution `dist/advisor.exe` will not work on systems without Claude CLI
3. **Standalone Usage:** The advisor CANNOT run standalone as documented

**Current 05-packaging.md says:**
```markdown
NOTE: Since we are using the Agent SDK, the advisor executes via the Claude Code runtime.
The `claude` CLI **must be installed and authenticated** on the system where the advisor runs.
```

But the build scripts compile a binary that **will fail** without the CLI.

### Required Fix

**Option A: Remove standalone binary compilation**
- Delete `build:win`, `build:linux` scripts
- Clarify the skill runs via `bun run` in Antigravity
- Update docs to emphasize Claude CLI prerequisite

**Option B: Keep compilation but document limitations clearly**
- Add prominent warning that binary requires `claude` CLI
- Explain this is NOT true standalone packaging
- May confuse users expecting self-contained binary

**Recommended:** **Option A** - Remove binary compilation for honesty and clarity.

---

## Code Quality Review

### 1. Executor Implementation

**Good:**
- Proper timeout handling with cleanup ✓
- Schema validation with error details ✓
- Client-side field injection ✓
- Clear error messages ✓

**Minor Issue:**

**Location:** `03-cli_engine.md:36`
```typescript
const fullPrompt = `<context>\n${context}\n</context>`;
```

**Concern:** If context is empty (which should not pass validation), this produces:
```
<context>

</context>
```

This is wasteful (sends meaningless tags) but not critical. Validation prevents this case.

---

### 2. Output Handler

**Good:**
- Clean markdown generation ✓
- Proper emoji/severity mapping ✓
- Conditional section rendering ✓
- File path handling ✓

**Minor Issue:**

**Location:** `03-cli_engine.md:93-95`
```typescript
const emoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[issue.severity];
```

**Concern:** TypeScript should already validate `issue.severity` as enum values, so this will never be `undefined`. This is safe but slightly redundant.

---

### 3. Entry Point

**Good:**
- Validation before expensive operations ✓
- Clear error messages ✓
- Proper error handling ✓

**Question:**

**Location:** `04-cli_interface.md:21-25`
```typescript
const claudePath = await which('claude');
if (!claudePath) {
  console.error('[Advisor] Error: Claude Code CLI (claude) not found...');
```

**Issue:** The Agent SDK's `query()` function would throw a similar error if `claude` isn't found. This check is redundant but provides a **better error message** to the user.

**Verdict:** Keep it for better UX, but document that SDK would also fail.

---

## Remaining Unresolved Concerns

### 1. Antigravity Integration

**Status:** Still UNKNOWN

The `.claude-skill.json` format and integration protocol remain unverified.

**Questions:**
- Does Antigravity use `process.argv` for CLI skills?
- Or does it import the function and call it directly?
- If direct import, how are arguments passed?
- Will `process.exit()` cause issues?

**Current entry point pattern:**
```typescript
async function main() {
  // CLI argument parsing
  const args = process.argv.slice(2);
  // ...
  process.exit(0);
}

if (import.meta.main) {
  main();
}
```

**If Antigravity imports and calls directly:**
- `process.argv` won't contain skill parameters
- `process.exit()` will terminate Antigravity's process
- Skill won't work

**Required:** Antigravity integration documentation verification.

---

### 2. Test Coverage

**Status:** Minimal

Current tests (04-cli_interface.md:68-89):
```
✓ Prompt loader unit tests (3 tests)
✓ Basic E2E test (1 test)
✗ Missing: Schema validation tests
✗ Missing: Output handler tests
✗ Missing: Executor timeout tests
✗ Missing: Error handling tests
```

**Critical Tests Missing:**

1. **Schema Validation:**
```typescript
test("should reject invalid structured_output", () => {
  const invalid = { summary: "test", issues: [], suggestions: [] };
  const parsed = AnalysisSchema.safeParse(invalid);
  // Should fail - severity not enum
});
```

2. **Timeout Behavior:**
```typescript
test("should throw on timeout", async () => {
  await expect(executeClaude(prompt, "test", "design-review", 1))
    .rejects.toThrow("Timed out");
});
```

3. **Empty Issues/Suggestions Arrays:**
```typescript
test("should handle empty arrays gracefully", async () => {
  const result = await executeClaude(...);
  // Verify issues and suggestions arrays exist (even if empty)
});
```

---

## Streaming Mode Detailed Analysis

### SDK Message Flow

Based on the async iterator pattern:

```typescript
for await (const message of query({...})) {
  if (message.type === 'result' && message.structured_output) {
    // Handle result
  }
}
```

**What messages could we receive?**

| Message Type | Description | Handled? |
|--------------|-------------|----------|
| `user` | User input echoed back | ✗ Ignored |
| `assistant` | Assistant thinking/reasoning | ✗ Ignored |
| `result` | Final result with structured_output | ✓ Handled |
| `error` | Error message | ✗ Not handled |
| `permission_request` | Permission needed for tool | ✗ Not handled |
| `tool_use` | Tool being used | ✗ Ignored |

### Current Handling

**What we DO handle:**
- ✓ `result` with `structured_output`
- ✓ Timeout via manual Promise.race

**What we DON'T handle:**
- ✗ `error` messages - would fall through loop
- ✗ `permission_request` - would hang indefinitely
- ✗ Empty loop - throws "No result received"

### Potential Failure Modes

**Scenario 1: Permission Timeout**
```
SDK asks for permission → No handler → Loop blocks → Timeout triggers
```
Result: User sees "Timeout" instead of permission request.

**Scenario 2: Error Message**
```
SDK sends error message → Falls through loop → Loop ends → "No result received"
```
Result: User sees "No result received" instead of actual error.

**Scenario 3: Structured Output Failure**
```
SDK returns result WITHOUT structured_output → Falls through → Loop ends → "No result received"
```
Result: Claude generated response but couldn't conform to schema. User sees cryptic message instead of helpful information.

### Recommended Error Handling

**Enhanced executor (03-cli_engine.md):**

```typescript
const queryPromise = (async (): Promise<AnalysisResult> => {
  const fullPrompt = `<context>\n${context}\n</context>`;
  
  let lastError: Error | null = null;
  
  for await (const message of query({
    prompt: fullPrompt,
    system: systemPrompt,
    options: {
      outputFormat: { type: 'json_schema', schema }
    }
  })) {
    if (message.type === 'result') {
      if (message.subtype === 'error_max_structured_output_retries') {
        throw new Error(
          `Could not generate valid structured output. The analysis may be complex.\n` +
          `Try simplifying your input or refining the schema.`
        );
      }
      
      if (message.structured_output) {
        const parsed = AnalysisSchema.safeParse(message.structured_output);
        if (parsed.success) {
          return {
            ...parsed.data,
            timestamp: new Date().toISOString(),
            persona: taskType
          };
        }
        throw new Error(`Invalid schema returned: ${JSON.stringify(parsed.error)}`);
      }
    }
    
    if (message.type === 'error') {
      lastError = new Error(`Agent error: ${message.error || 'Unknown error'}`);
    }
    
    if (message.type === 'permission_request') {
      throw new Error(
        'Permission required but cannot be displayed in headless mode. ' +
        'Please run with interactive permissions or configure allowed tools.'
      );
    }
  }
  
  throw lastError || new Error('No result received from Claude');
})();
```

---

## Architecture Trade-offs Summary

| Aspect | Original CLI Spawn | Agent SDK (current) | Verdict |
|--------|------------------:|-------------------:|---------|
| Code complexity | High (process mgmt) | Medium | SDK wins |
| External dependencies | Claude CLI | Claude CLI | **Tie** |
| Structured output | Manual parsing | Native | SDK wins |
| Type safety | None | Full (Zod) | SDK wins |
| Error handling | Manual | Built-in + manual | SDK wins |
| Deployment | Self-contained binary | Requires CLI + bun | **CLI wins** |
| Streaming support | No | Yes | SDK wins |
| Multi-turn support | No | Yes | SDK wins |

**Overall:** SDK wins on technical quality, **but deployment is more complex** than initially understood.

---

## Final Recommendations

### MUST FIX Before Implementation

1. **Remove misleading standalone binary compilation:**
   - Delete `build:win` and `build:linux` scripts from `package.json`
   - Remove or clarify Task 8 in `05-packaging.md`
   - Update docs to emphasize: "Requires both Bun and Claude Code CLI"

2. **Add error message handling:**
   - Handle `error` and `permission_request` message types
   - Check for `error_max_structured_output_retries` subtype
   - Provide better error messages to users

3. **Verify Antigravity integration:**
   - Obtain official skill registration format
   - Determine if Antigravity uses subprocess or direct import
   - Adjust entry point if needed (remove `process.exit`, change argument parsing)

### SHOULD FIX During Implementation

4. **Add missing unit tests:**
   - Schema validation test cases
   - Executor timeout test
   - Error handling tests

5. **Add integration tests:**
   - Test with large input (near 50K limit)
   - Test with minimal valid input
   - Test error scenarios

6. **Document streaming mode decision:**
   - Add comment explaining why streaming iterator is used
   - Document that we don't use async generator input
   - Explain single-message nature of the skill

### NICE TO HAVE

7. **Consider environment variable support:**
   - Allow configuration via `ADVISOR_TIMEOUT`
   - Allow `ADVISER_MODEL` override (if supported by SDK)

8. **Add logging/debug mode:**
   - Verbose mode to show SDK messages
   - Debug flag to log intermediate states

---

## Streaming Mode Verdict

**Current Implementation:** ✅ CORRECT

The advisor correctly uses the streaming iterator pattern (`for await`) because:

1. **Required for structured outputs:** Only available via async iterator
2. **Single-message input pattern:** Appropriate for the skill's one-shot nature
3. **No streaming input features needed:** We don't need images, queues, or hooks

**Documentation Compliance:** The implementation aligns with the SDK's intended use case: using streaming mode for structured output retrieval even with single-message input.

---

## Conclusion

**Positive Progress:**
- All previous critical bugs have been fixed
- Streaming mode is correctly implemented
- Input validation and error handling are robust

**Critical New Finding:**
- Agent SDK **requires** Claude Code CLI as runtime
- Standalone binary compilation is misleading
- Deployment is more complex than initially stated

**Status Ready for Implementation:**
- ✅ After removing standalone build scripts
- ✅ After adding enhanced error handling
- ⚠️ Pending Antigravity integration format verification
- ⚠️ Pending missing test coverage

**Architecture Score:** 8/10 (points deducted for deployment complexity not fully disclosed)

**Streaming Mode Score:** 10/10 (correctly implemented for use case)
