---
name: adviser
description: Critical analysis and quality assurance for design documents, implementation plans, and code verification using Claude Agent SDK. Use when reviewing designs, plans, checking code quality, or performing structured analysis with issue tracking.
compatibility: Self-contained executable (Windows/Linux). Requires Claude Code CLI (claude) and ANTHROPIC_API_KEY environment variable on target.
metadata:
  author: skilld
  version: "2.0"
---

# Adviser Skill

Provides critical analysis with three specialized personas for different types of code work.

## When to Use This Skill

- **Design Review** (`design-review`): Analyzing design documentation for edge cases, gaps, and concerns
- **Plan Analysis** (`plan-analysis`): Reviewing implementation plans for correctness and sequencing
- **Code Verification** (`code-verification`): Cross-referencing code against design/plan for accuracy

## Deployment

### Self-Contained Executables

The adviser is distributed as a self-contained executable—no Bun runtime required on the target machine.

| Platform | Executable | Location |
|----------|------------|----------|
| Windows x64 | `adviser.exe` | `.agent/skills/adviser/adviser.exe` |
| Linux x64 | `adviser` | `.agent/skills/adviser/adviser` |

### Building from Source

If you need to rebuild the executables:

```powershell
# Build both Windows and Linux
./build.ps1

# Build only Windows
./build.ps1 -WindowsOnly

# Build only Linux
./build.ps1 -LinuxOnly
```

**Build Requirements:** Bun 1.1+ (for cross-compilation)

## How to Use

### Windows

```cmd
adviser.exe <taskType> [options]
```

### Linux

```bash
./adviser <taskType> [options]
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
adviser design-review -c "Your design document text..."

# From file
adviser design-review -c @design-doc.txt

# From stdin
cat design.md | adviser design-review -c @-
```

### Examples

```bash
# Quick design review with direct text
adviser design-review -c "API design for user auth"

# Full CLI with file input
adviser plan-analysis --mode workflow --context @implementation-plan.md

# Code verification with timeout
adviser code-verification -c @src/auth.ts -t 90000
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
├── build.ps1             # Build script for executables
├── dist/                 # Built executables
│   ├── adviser.exe       # Windows x64
│   └── adviser           # Linux x64
├── index.ts              # Main CLI entry point
├── runtimes.ts           # Claude SDK execution
├── output.ts             # Output formatting
├── motifs.ts             # Persona prompt loader
├── schemas.ts            # Zod validation schemas
├── types.ts              # TypeScript types
└── motifs/               # Persona prompt templates
    ├── architect.txt
    ├── strategist.txt
    ├── auditor.txt
    └── aisp-spec.md
```

## Prerequisites

On the **target machine** (where adviser runs):

- **Claude Code CLI**: `curl -fsSL https://claude.ai/install.sh | bash`
- **ANTHROPIC_API_KEY**: Must be set in environment

On the **build machine** (to compile executables):

- **Bun** (v1.1+): `curl -fsSL https://bun.sh/install | bash`

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ADVISER_OUTPUT_DIR` | Output directory for reviews | `docs/reviews` |
