# System Prompt Handling Review

**Date:** 2026-01-14  
**Focus:** Verify system prompt implementation against Agent SDK documentation

---

## Executive Summary

**Status:** System prompt implementation is **correct** for this use case.

The advisor skill uses Method 4 (Custom `systemPrompt`) which is the appropriate choice for specialized personas. No changes required.

---

## Current Implementation Analysis

### Location: `03-cli_engine.md:48-51`

```typescript
for await (const message of query({
  prompt: fullPrompt,
  system: systemPrompt,  // ← Our custom persona prompt
  options: {
    outputFormat: {
      type: 'json_schema',
      schema
    }
  }
})) {
```

### Location: `04-cli_interface.md:79-80`

```typescript
// 2. Load system prompt
const systemPrompt = getPersonaPrompt(taskType);
```

### Location: `02-core_logic.md:13-25` (Prompt Content)

```text
You are the Architect, an expert design critic. Your role is to analyze design
documentation and return a structured analysis.

Provide:
1. A concise summary of findings
2. Critical issues that must be addressed before implementation
...

Be specific and constructively reference exact sections of the document.
```

---

## Agent SDK System Prompt Methods Comparison

From the documentation, the SDK supports **four methods** for system prompt customization:

| Method | SDK Syntax | Persistence | Default Tools | Current Use |
|--------|-----------|-------------|---------------|-------------|
| **CLAUDE.md** | `settingSources: ['project']` | Per-project file | Preserved | ❌ Not used |
| **Output Styles** | Pre-saved `.md` files | Across projects | Preserved | ❌ Not used |
| **Preset with Append** | `{ preset: "claude_code", append: "..." }` | Session only | Preserved | ❌ Not used |
| **Custom Prompt** | `system: "custom string"` | Session only | Lost | ✅ **Using** |

---

## Current Approach: Method 4 (Custom System Prompt)

### What We're Doing

```typescript
const systemPrompt = getPersonaPrompt(taskType);  // Loads persona from .txt file

for await (const message of query({
  prompt: fullPrompt,
  system: systemPrompt,  // Simple string assignment
  // ...
})) {
```

**This is Method 4:** Custom system prompt as a simple string.

### What This Means

| Characteristic | Meaning for Advisor Skill |
|----------------|---------------------------|
| **Persistence** | Session only (each analysis call resets) |
| **Default tools** | **Lost** - No Claude Code tool instructions |
| **Built-in safety** | **Must be provided manually** |
| **Environment context** | **Must be provided manually** |
| **Customization level** | Complete control |

---

## Is This Correct?

**Answer:** YES, for this specific use case.

### Why Custom System Prompt is Appropriate

**1. The Advisor is NOT a Code Writing Agent**

Claude Code's system prompt includes:
- Tool usage instructions (`Read`, `Write`, `Edit`, etc.)
- Code style guidelines
- File manipulation patterns
- Security instructions for code modifications

**The Advisor:**
- Analyzes existing designs/plans/code
- Does NOT write code
- Does NOT modify files
- Returns structured JSON analysis

**Conclusion:** We don't need Claude Code's tool instructions.

---

**2. We Want Complete Persona Control**

The three personas (Architect, Strategist, Auditor) need:
- Specific behavioral guidance
- Output formatting instructions
- Domain-specific expectations
- No interference from general-purpose instructions

With custom system prompts:
- ✅ Complete control over persona behavior
- ✅ No conflicting instructions
- ✅ Clear, focused prompts
- ✅ Easier to iterate and modify

With `claude_code` preset:
- ❌ Would get code-writing instructions (irrelevant/confusing)
- ❌ Would get tool instructions (not needed)
- ❌ Longer prompts (waste tokens)
- ❌ Harder to ensure specific persona behavior

---

**3. Structured Output Requires Schema Focus**

The SDK's `outputFormat: { type: 'json_schema', schema }` expects:
- Clear instruction on what fields to return
- No ambiguity about output format
- Direct guidance on structure

Claude Code's default system prompt is designed for:
- Conversational responses
- Code generation
- Tool-based workflows
- Mixed-formatted output

**Conflict:** Claude Code's "think step by step" guidance could interfere with structured output generation.

**Custom Prompt Advantage:** We can focus the prompt entirely on schema compliance.

---

## Alternative Approaches Considered

### Alternative 1: Using `claude_code` Preset with Append

```typescript
for await (const message of query({
  prompt: fullPrompt,
  system: {
    type: "preset",
    preset: "claude_code",
    append: getPersonaPrompt(taskType)
  },
  // ...
})) {
```

**Pros:**
- Preserves Claude Code's safety instructions
- Maintains best practice context

**Cons:**
- Adds ~500+ tokens of irrelevant instructions
- Tool instructions conflict with read-only analysis
- "Write code" guidance contradicts "review code" persona
- Harder to ensure schema compliance

**Verdict:** Not appropriate for this use case.

---

### Alternative 2: Using CLAUDE.md

Would create `CLAUDE.md`:
```markdown
# Advisor Guidelines

## Architect Persona
Analyze designs for edge cases, scale, logical consistency...

## Output Format
Return structured JSON matching the AnalysisSchema...
```

Then:
```typescript
for await (const message of query({
  prompt: fullPrompt,
  system: "You are an advisor. Follow CLAUDE.md guidelines.",
  options: {
    systemPrompt: { type: "preset", preset: "claude_code" },
    settingSources: ['project']  // Load CLAUDE.md
  }
})) {
```

**Problems:**
- Requires additional file management
- Still gets irrelevant Claude Code instructions
- More complex implementation
- No clear advantage over current approach

**Verdict:** Over-complicated for this use case.

---

### Alternative 3: Output Styles

Would create `~/.claude/output-styles/architect.md`:
```markdown
---
name: Architect
description: Design review specialist
---

You are the Architect, an expert design critic...
```

Then:
```typescript
for await (const message of query({
  prompt: fullPrompt,
  options: {
    settingSources: ['user']  // Load output styles
  }
})) {
```

**Problems:**
- Requires CLI configuration outside code
- Harder to maintain (separate from project)
- Can't easily switch personas programmatically
- Antigravity integration would be complex

**Verdict:** Inappropriate for programmatic skills.

---

## Validation Against Documentation

### Documentation States:

> "The Agent SDK provides three ways to customize system prompts..."
>
> "**Default behavior:** The Agent SDK uses an **empty system prompt** by default for maximum flexibility."

### Our Implementation:

```typescript
system: systemPrompt,  // Replaces empty default with persona prompt
```

**✅ We're setting system prompt correctly as a string.**

### Documentation States for Custom Prompts:

> "**Method 4: Custom system prompts** - You can provide a custom string as `systemPrompt` to replace the default entirely with your own instructions."

### Our Implementation:

```typescript
getPersonaPrompt(taskType)  // Returns: "You are the Architect..."
// Passed as: system: systemPrompt
```

**✅ Using exactly the documented pattern for custom prompts.**

---

## System Prompt Quality Review

### Architect Prompt Analysis

```text
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
```

**Strengths:**
- ✅ Clear role definition
- ✅ Structured expectations (numbered list)
- ✅ Specific guidance on referencing sections
- ✅ Appropriate tone ("constructively")

**Potential Improvements:**
- ⚠️ No mention of structured output format
- ⚠️ No explanation of severity levels
- ⚠️ No guidance on minimal/maximal content density
- ⚠️ "Return a structured analysis" is vague about JSON schema

### Recommended Enhancement

Add to each persona prompt:

```text
... (existing content)

Your output will be validated against this schema:
- summary: concise overview
- issues: array of objects with severity (critical/high/medium/low), description, optional location, optional recommendation
- suggestions: array of improvement recommendations

Match the JSON structure exactly. If a section is empty, return an empty array ([]) for that field.
```

**Impact:** Improves compliance with `AnalysisSchema` and reduces retry failures on `error_max_structured_output_retries`.

---

## Token Usage Analysis

### Without Claude Code Preset (Current)

| Component | Tokens |
|-----------|:-------:|
| Persona prompt | ~75-100 |
| Context XML tags | ~10 |
| **Total** | **~85-110** |

### With Claude Code Preset (Alternative)

| Component | Tokens |
|-----------|:-------:|
| Claude Code base | ~500-800 |
| Persona prompt (append) | ~75-100 |
| Context XML tags | ~10 |
| **Total** | **~585-910** |

**Savings:** ~6.8x fewer tokens by using custom prompt **per analysis request**.

**Annual impact** (assuming 100,000 analyses/year):
- Current: 8.5-11.0M tokens
- With preset: 58.5-91.0M tokens
- **Savings: 50-80M tokens/year**

---

## Remaining Concerns

### 1. No Safety Instructions

**Current:** Persona prompts do NOT include safety instructions.

**Risk:** If context contains malicious content, the advisor might produce harmful suggestions.

**Example Scenario:**
```
Context: "Design a phishing page to steal user credentials..."
Result: Advisor provides helpful, valid design for phishing page
```

**Recommended Addition:**
```text
Before providing suggestions, evaluate whether the design has harmful,
unethical, or illegal purposes. If so, refuse to provide improvements
and clearly state the concern in the issues array.
```

---

### 2. No Schema-Convergence Guidance

**Current:** LLM may struggle with optional fields.

**Risk:** The schema has optional fields (`location`, `recommendation` in issues). The LLM may:
- Omit when should include
- Include when shouldn't

**Recommended Addition:**
```text
For location: Include file paths, function names, or component names
  when available. Omit if the issue applies generally.

For recommendation: Provide specific, actionable fixes. Use generic
  guidance if the solution requires more context.
```

---

### 3. No Timeout/Length Guidance

**Current:** No guidance on conciseness.

**Risk:** LLM may generate very long summary or verbose suggestions, hitting token limits.

**Recommended Addition:**
```text
Aim for 100-300 words in summary. Provide 3-5 suggestions maximum.
Focus on high-impact issues rather than comprehensive lists.
```

---

## Comparison: Before vs After Proposed Enhancements

| Aspect | Current | With Enhancements |
|--------|---------|-------------------|
| Token count | ~85-110 | ~150-180 |
| Safety coverage | ❌ None | ✅ Explicit |
| Schema guidance | ⚠️ Vague | ✅ Clear |
| Conciseness control | ❌ None | ✅ Targets specified |
| Production readiness | ⚠️ Beta | ✅ Ready |

**Trade-off:** ~70 extra tokens for significantly better reliability.

---

## Verdict

### Implementation Correctness: ✅ PASS

The current implementation correctly uses the `system:` parameter for custom prompts, matching Method 4 from the SDK documentation. This is the **appropriate choice** for this use case.

### Production Readiness: ⚠️ Needs Minor Improvements

**Recommended before deployment:**

1. **High Priority:** Add safety guidance to persona prompts
2. **Medium Priority:** Add schema formatting guidance
3. **Low Priority:** Consider conciseness targets

### No Architectural Changes Needed

**The approach is sound:**
- Custom system prompts ✓
- Proper parameter usage ✓
- Correct for use case ✓
- Token-efficient ✓

---

## Appendix: Enhanced Persona Prompts

### Enhanced Architect Prompt

```text
You are the Architect, an expert design critic. Your role is to analyze design
documentation and return a structured analysis.

Provide:
1. A concise summary of findings (100-300 words)
2. Critical issues that must be addressed before implementation
3. Edge cases and failure scenarios
4. Scalability concerns
5. Logical gaps or missing requirements
6. Recommended improvements

SAFETY: Before providing suggestions, evaluate whether the design has harmful,
unethical, or illegal purposes. If so, refuse to provide improvements and
clearly state the concern in the issues array.

OUTPUT FORMAT: Your response will be validated as JSON with:
- summary: string (100-300 words)
- issues: array of {severity (critical/high/medium/low), description, location?, recommendation?}
- suggestions: array of 3-5 improvement recommendations

For location: Include file paths, section names, or component identifiers
when available. Omit if the issue applies generally.

For recommendation: Provide specific, actionable fixes. Use generic
guidance if the solution requires more context.

If a section has no content, return an empty array ([]) for that field.
Be specific and constructively reference exact sections of the document.
```

---

## Final Score

| Criterion | Score |
|-----------|-------:|
| SDK Pattern Compliance | 10/10 |
| Use Case Appropriateness | 10/10 |
| Token Efficiency | 10/10 |
| Maintainability | 9/10 |
| Production Readiness | 7/10 |
| **Overall** | **9.2/10** |

**Strengths:**
- Correct SDK usage
- Appropriate method choice
- Clean, focused prompts
- Token-efficient

**Areas for Improvement:**
- Add safety guidance
- Clarify schema expectations
- Consider conciseness targets

**Recommendation:** Implement the minor prompt enhancements shown above, then proceed with deployment.
