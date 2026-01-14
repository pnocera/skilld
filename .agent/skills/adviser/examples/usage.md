# Adviser Skill Usage Examples

## Quick Start

```bash
# Design review with direct text
bun run .agent/skills/adviser/scripts/index.ts design-review -c "Your design document text..."

# Plan analysis with file input
bun run .agent/skills/adviser/scripts/index.ts plan-analysis -c @implementation-plan.md

# Code verification with workflow output
bun run .agent/skills/adviser/scripts/index.ts code-verification -m workflow -c @src/auth.ts
```

## Full CLI Options

```bash
bun run .agent/skills/adviser/scripts/index.ts <taskType> [options]

Arguments:
  taskType     Required: design-review, plan-analysis, code-verification

Options:
  --mode, -m      Output mode: human (default) or workflow
  --context, -c   Text/document content to analyze (required)
  --timeout, -t   Timeout in milliseconds (default: 60000)
  --help, -h      Show help
```

## Context Input Methods

```bash
# Direct text
bun run .agent/skills/adviser/scripts/index.ts design-review -c "API design document..."

# From file
bun run .agent/skills/adviser/scripts/index.ts design-review -c @design-doc.txt

# From stdin
cat design.md | bun run .agent/skills/adviser/scripts/index.ts design-review -c @-
```

## Output Modes

```bash
# Human mode (default) - saves markdown to docs/reviews/
bun run .agent/skills/adviser/scripts/index.ts design-review -c @design.md

# Workflow mode - JSON to stdout for pipeline integration
bun run .agent/skills/adviser/scripts/index.ts design-review -m workflow -c @design.md > result.json
```
