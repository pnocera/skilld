---
name: adviser
description: Critical analysis and quality assurance for design documents, implementation plans, and code verification using Claude Agent SDK. Use when reviewing designs, plans, checking code quality, or performing structured analysis with issue tracking.
---

# Adviser Skill

Provides critical analysis with three specialized personas for different types of code work.

## When to use this skill

- **Design Review** (`design-review`): Analyzing design documentation for edge cases, gaps, and concerns
- **Plan Analysis** (`plan-analysis`): Reviewing implementation plans for correctness and sequencing
- **Code Verification** (`code-verification`): Cross-referencing code against design/plan for accuracy

## How to use

Run via npm script:

```bash
bun run advise <taskType> [mode] [context] [timeout]
```

Or run the script directly:

```bash
bun run .agent/skills/adviser/scripts/advise.ts <taskType> [mode] [context] [timeout]
```

**Parameters:**
- `taskType` (required): One of `design-review`, `plan-analysis`, `code-verification`
- `mode` (optional): `human` (default, saves markdown files) or `workflow` (outputs JSON)
- `context` (required): The text/document/content to analyze
- `timeout` (optional): Execution timeout in milliseconds (default: 60000)

**Example:**
```bash
bun run advise design-review human "Design doc for real-time chat app"
```

## Output formats

**Human mode** (`human`):
- Markdown file saved to `docs/reviews/` with detailed analysis
- Includes summary, issues severity-colored, and suggestions

**Workflow mode** (`workflow`):
- JSON-structured result to stdout
- Machine-parsable for integration into other tools

## Personas and focus areas

### Design Review (Architect)
Analyzes design documentation for:
- Critical issues that must be addressed before implementation
- Edge cases and failure scenarios
- Scalability concerns
- Logical gaps or missing requirements
- Recommended improvements

### Plan Analysis (Strategist)
Reviews implementation plans for:
- Missing steps or tasks
- Logical ordering issues
- Alignment with design requirements
- Dependency gaps between tasks
- Ambiguities that could cause implementation errors

### Code Verification (Auditor)
Cross-references implemented code for:
- Implementation inaccuracies vs design/plan
- Missing features or components
- Implementation errors or bugs
- Deviations from intended architecture
- Quality concerns and recommendations

## Prerequisistes

The script requires:
- **Bun** runtime (installed on the system)
- **Claude Code CLI** (`claude`) - required by Agent SDK
- **ANTHROPIC_API_KEY** environment variable

## Configuration

Optional environment variables:
- `ADVISER_OUTPUT_DIR`: Output directory for reviews (default: `docs/reviews`)

## Script location

The executable is at `.agent/skills/adviser/scripts/advise` and uses the Agent SDK for structured output via JSON schema validation.
