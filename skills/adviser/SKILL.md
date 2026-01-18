---
name: adviser
description: Critical analysis and quality assurance for design documents, implementation plans, and code verification. Use when reviewing designs, plans, or checking code quality.
---

# Adviser Skill

Provides critical analysis with three specialized personas for different types of code work.

## When to Use This Skill

- **Design Review** (`design-review`): Analyzing design documentation for edge cases, gaps, and concerns
- **Plan Analysis** (`plan-analysis`): Reviewing implementation plans for correctness and sequencing
- **Code Verification** (`code-verification`): Cross-referencing code against design/plan for accuracy

## How to Use

### Windows

```cmd
{{ADVISER_EXE}} <taskType> [options]
```

### Linux

```bash
{{ADVISER_BIN}} <taskType> [options]
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `taskType` | Yes | One of: `design-review`, `plan-analysis`, `code-verification` |
| `--mode, -m` | No | Output mode: `human` (default), `workflow` (JSON), or `aisp` (AISP 5.1) |
| `--context, -c` | Yes | Text/document content to analyze |
| `--timeout, -t` | No | Timeout in ms (default: 300000) |

### Context Input Methods

```bash
# Direct text
{{ADVISER_BIN}} design-review -c "Your design document text..."

# From file
{{ADVISER_BIN}} design-review -c @design-doc.txt

# From stdin
cat design.md | {{ADVISER_BIN}} design-review -c @-
```

### Examples

```bash
# Quick design review with direct text
{{ADVISER_BIN}} design-review -c "API design for user auth"

# Plan analysis with AISP output for AI-to-AI communication
{{ADVISER_BIN}} plan-analysis -m aisp -c @implementation-plan.md

# Code verification with JSON output
{{ADVISER_BIN}} code-verification -m workflow -c @src/auth.ts
```

## Output Formats

**Human mode** (`human`):
- Markdown file saved to `docs/reviews/` with detailed analysis
- Includes summary, severity-colored issues, and suggestions

**Workflow mode** (`workflow`):
- JSON-structured result to stdout for pipeline integration
- Schema: `{ summary, issues: [{ severity, description, location?, recommendation? }], suggestions: [] }`

**AISP mode** (`aisp`):
- AISP 5.1 structured output for AI-to-AI communication
- See `aisp-quick-ref.md` in this folder for interpreting output

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty context | Error: "Context is required for analysis" |
| Context > 500KB | Error: "Context too large" |
| Claude CLI not found | Error with installation instructions |
| Timeout exceeded | Aborts with timeout error |
