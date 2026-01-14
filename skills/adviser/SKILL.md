---
name: adviser
description: Critical analysis and quality assurance for design documents, implementation plans, and code verification using Claude Agent SDK. Use when reviewing designs, plans, checking code quality, or performing structured analysis with issue tracking.
compatibility: Requires Bun runtime (v1.3.4+), Claude Code CLI (claude), and ANTHROPIC_API_KEY environment variable
metadata:
  author: skilld
  version: "1.0"
---

# Adviser Skill

Provides critical analysis with three specialized personas for different types of code work.

## When to Use This Skill

- **Design Review** (`design-review`): Analyzing design documentation for edge cases, gaps, and concerns
- **Plan Analysis** (`plan-analysis`): Reviewing implementation plans for correctness and sequencing
- **Code Verification** (`code-verification`): Cross-referencing code against design/plan for accuracy

## How to Use

Run the CLI script:

```bash
bun run scripts/index.ts <taskType> [options]
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `taskType` | Yes | One of: `design-review`, `plan-analysis`, `code-verification` |
| `--mode, -m` | No | Output mode: `human` (default) or `workflow` |
| `--context, -c` | Yes | Text/document content to analyze |
| `--timeout, -t` | No | Timeout in ms (default: 60000) |

### Context Input Methods

```bash
# Direct text
bun run scripts/index.ts design-review -c "Your design document text..."

# From file
bun run scripts/index.ts design-review -c @design-doc.txt

# From stdin
cat design.md | bun run scripts/index.ts design-review -c @-
```

### Examples

```bash
# Quick design review with direct text
bun run scripts/index.ts design-review -c "API design for user auth"

# Full CLI with file input
bun run scripts/index.ts plan-analysis --mode workflow --context @implementation-plan.md

# Code verification with timeout
bun run scripts/index.ts code-verification -c @src/auth.ts -t 90000
```

## Output Formats

**Human mode** (`human`):
- Markdown file saved to `docs/reviews/` with detailed analysis
- Includes summary, severity-colored issues, and suggestions

**Workflow mode** (`workflow`):
- JSON-structured result to stdout for pipeline integration
- Schema: `{ summary, issues: [{ severity, description, location?, recommendation? }], suggestions: [] }`

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty context | Error: "Context is required for analysis" |
| Context > 500KB | Error: "Context too large" |
| Claude CLI not found | Error with installation instructions |
| No API key | SDK reports authentication failure |
| Timeout exceeded | Aborts with timeout error |

## Directory Structure

```
adviser/
├── SKILL.md              # This file
├── scripts/
│   ├── index.ts          # Main CLI entry point
│   ├── runtimes.ts       # Claude SDK execution
│   ├── output.ts         # Output formatting
│   ├── motifs.ts         # Persona prompt loader
│   ├── schemas.ts        # Zod validation schemas
│   ├── types.ts          # TypeScript types
│   └── motifs/           # Persona prompt templates
│       ├── architect.txt
│       ├── strategist.txt
│       └── auditor.txt
└── examples/
    └── usage.md          # Usage examples
```

## Prerequisites

- **Bun** (v1.3.4+): `curl -fsSL https://bun.sh/install | bash`
- **Claude Code CLI**: `curl -fsSL https://claude.ai/install.sh | bash`
- **ANTHROPIC_API_KEY**: Must be set in environment

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ADVISER_OUTPUT_DIR` | Output directory for reviews | `docs/reviews` |
