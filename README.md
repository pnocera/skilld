# Adviser Skill for Antigravity

Critical analysis and quality assurance advisor using the Claude Agent SDK.

## Features

Three analysis personas for different types of code work:
- **Design Review** (architect): Analyzes design documentation for edge cases, gaps, and concerns
- **Plan Analysis** (strategist): Reviews implementation plans for correctness and sequencing
- **Code Verification** (auditor): Cross-references code against design/plan for accuracy

## Prerequisites

### Required

- **Bun** (v1.3.4+) - Runtime and package manager
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

- **Claude Code CLI** - Required by the Agent SDK
  ```bash
  curl -fsSL https://claude.ai/install.sh | bash
  ```

- **Anthropic API Key** - For Claude API access
  ```bash
  export ANTHROPIC_API_KEY=your_key_here
  ```

### Installation Steps

1. Install dependencies:
   ```bash
   bun install
   ```

2. Login to Claude (creates authenticated runtime):
   ```bash
   claude login
   ```

## Antigravity Registration

Point Antigravity to `skills/adviser/index.ts`.

## Usage

Run directly with Bun:
```bash
bun run skills/adviser/index.ts <taskType> [mode] [context] [timeout]
```

**Parameters:**
- `taskType`: One of `design-review`, `plan-analysis`, `code-verification`
- `mode`: `human` (default, saves markdown files) or `workflow` (outputs JSON)
- `context`: The text/document content to analyze
- `timeout`: Execution timeout in milliseconds (default: 60000)

**Example:**
```bash
bun run skills/adviser/index.ts design-review human "Design doc for real-time chat app"
```

**Output:**
- Human mode: Markdown file saved to `docs/reviews/` with detailed analysis
- Workflow mode: JSON-structured result to stdout

## Configuration

Optional environment variable:
- `ADVISER_OUTPUT_DIR`: Output directory for reviews (default: `docs/reviews`)

## Development

Run tests:
```bash
# All tests
bun test

# Watch mode
bun test --watch
```

## Project Structure

```
skilld/
├── skills/adviser/
│  ── .claude-skill.json  # Antigravity skill descriptor
│  ── index.ts            # Main entry point
│  ── types.ts            # Shared type definitions
│  ── schemas.ts          # Zod validation schemas
│  ── prompts/            # Persona prompt templates
│   │   -- architect.txt
│   │   -- strategist.txt
│   │   -- auditor.txt
│   └── *.test.ts         # Unit and integration tests
├── package.json
├── tsconfig.json
└── .env.example
```
