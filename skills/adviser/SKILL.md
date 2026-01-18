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
{{ADVISER_EXE}} <taskType> --input <file> [options]
```

### Linux

```bash
{{ADVISER_BIN}} <taskType> --input <file> [options]
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `taskType` | Yes | One of: `design-review`, `plan-analysis`, `code-verification` |
| `--input, -i` | Yes | Path to input file containing context to analyze |
| `--output, -o` | No | Explicit output file path (auto-generated if omitted) |
| `--output-dir` | No | Override output directory (default: docs/reviews/) |
| `--mode, -m` | No | Output mode: `aisp` (default), `human` (markdown), or `workflow` (JSON) |
| `--timeout, -t` | No | Timeout in ms (default: 1800000 / 30 min) |

### Examples

```bash
# Design review from file
{{ADVISER_BIN}} design-review --input design-doc.md

# Plan analysis with explicit JSON output
{{ADVISER_BIN}} plan-analysis --input plan.md --output result.json --mode workflow

# Code verification with custom output directory
{{ADVISER_BIN}} code-verification --input src/auth.ts --output-dir ./reports/

# AISP mode with explicit output file
{{ADVISER_BIN}} plan-analysis --input plan.md --output analysis.aisp --mode aisp
```

## Output Formats

All output is written to files (no stdout output except status messages).

**Human mode** (`human`):
- Markdown file saved to output directory with detailed analysis
- Includes summary, severity-colored issues, and suggestions

**Workflow mode** (`workflow`):
- JSON file for pipeline integration
- Schema: `{ summary, issues: [{ severity, description, location?, recommendation? }], suggestions: [] }`

**AISP mode** (`aisp`):
- AISP 5.1 structured output for AI-to-AI communication
- See `aisp-quick-ref.md` in this folder for interpreting output

## Output File Naming

When `--output` is not specified, files are auto-generated with the pattern:
- `review-<taskType>-<timestamp>-<id>.md` (human mode)
- `review-<taskType>-<timestamp>-<id>.json` (workflow mode)
- `review-<taskType>-<timestamp>-<id>.aisp` (aisp mode)

The 4-character `<id>` ensures unique filenames even when running multiple advisers in parallel.

Files are saved to `docs/reviews/` by default, or the directory specified by `--output-dir` or `ADVISED_OUTPUT_DIR` environment variable.

## Manifest Files

Every adviser run creates a `.manifest.json` file alongside the main output. This manifest provides structured metadata about created assets for programmatic access:

```json
{
  "status": "success",
  "taskType": "plan-analysis",
  "mode": "workflow",
  "assets": [
    { "type": "workflow", "format": "json", "path": "/path/to/review.json" }
  ],
  "timestamp": "2026-01-18T11:12:00Z"
}
```

The manifest file is named `<output-file>.manifest.json` (e.g., `review-plan-analysis-1737194000.json.manifest.json`).

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Input file not found | Error: "Input file not found: <path>" |
| Input file empty | Error: "Input file is empty" |
| Input file > 500KB | Error: "Input file too large" |
| Claude CLI not found | Error with installation instructions |
| Timeout exceeded | Aborts with timeout error |
