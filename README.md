# Adviser Skill for Antigravity

Critical analysis and quality assurance advisor using the Claude Agent SDK.

## Features

Three analysis personas for different types of code work:
- **Design Review** (architect): Analyzes design documentation for edge cases, gaps, and concerns
- **Plan Analysis** (strategist): Reviews implementation plans for correctness and sequencing
- **Code Verification** (auditor): Cross-references code against design/plan for accuracy

## Self-Contained Executables

The adviser is distributed as **self-contained executables**—no Bun runtime required on the target machine!

| Platform | Executable | Size |
|----------|------------|------|
| Windows x64 | `adviser.exe` | ~115 MB |
| Linux x64 | `adviser` | ~96 MB |

## Quick Start

### Option 1: Deploy to a Project

```bash
# Deploy adviser skill and workflows to your project
bun deploy-skill.ts /path/to/your/project
```

This copies the executables to `.agent/skills/adviser/` in your project.

### Option 2: Use Directly

```bash
# Windows
.\skills\adviser\dist\adviser.exe design-review -c @design-doc.md

# Linux
./skills/adviser/dist/adviser design-review -c @design-doc.md
```

## Prerequisites

### On Target Machine (where adviser runs)

- **Claude Code CLI** - Required by the Agent SDK
  ```bash
  curl -fsSL https://claude.ai/install.sh | bash
  ```

- **Anthropic API Key** - For Claude API access
  ```bash
  export ANTHROPIC_API_KEY=your_key_here
  ```

### On Build Machine (to compile executables)

- **Bun** (v1.1+) - For compilation
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

- **Docker** - For Linux cross-compilation (when building on Windows)

## Building

```powershell
# Build both Windows and Linux executables
./skills/adviser/build.ps1

# Build Windows only (native, no Docker)
./skills/adviser/build.ps1 -WindowsOnly

# Build Linux only (requires Docker)
./skills/adviser/build.ps1 -LinuxOnly
```

## Usage

```bash
adviser <taskType> [options]
```

**Parameters:**
- `taskType`: One of `design-review`, `plan-analysis`, `code-verification`
- `--mode, -m`: `human` (default, saves markdown files) or `workflow` (outputs JSON)
- `--context, -c`: The text/document content to analyze
- `--timeout, -t`: Execution timeout in milliseconds (default: 60000)

**Context Input:**
```bash
# Direct text
adviser design-review -c "Design doc for real-time chat app"

# From file
adviser design-review -c @design-doc.md

# From stdin
cat design.md | adviser design-review -c @-
```

**Output:**
- Human mode: Markdown file saved to `docs/reviews/` with detailed analysis
- Workflow mode: JSON-structured result to stdout

## Configuration

Optional environment variable:
- `ADVISER_OUTPUT_DIR`: Output directory for reviews (default: `docs/reviews`)

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Watch mode
bun test --watch

# Run directly (development)
bun run skills/adviser/index.ts design-review -c "test"
```

## Project Structure

```
skilld/
├── skills/adviser/
│   ├── SKILL.md              # Skill documentation
│   ├── build.ps1             # Build script for executables
│   ├── dist/                 # Compiled executables
│   │   ├── adviser.exe       # Windows x64
│   │   └── adviser           # Linux x64
│   ├── index.ts              # Main entry point
│   ├── runtimes.ts           # Claude SDK execution
│   ├── output.ts             # Output formatting
│   ├── schemas.ts            # Zod validation schemas
│   ├── types.ts              # Type definitions
│   └── motifs/               # Persona prompt templates
│       ├── architect.txt
│       ├── strategist.txt
│       ├── auditor.txt
│       └── aisp-spec.md
├── workflows/                # Antigravity workflows
│   ├── brainstorm.md
│   ├── writing-plan.md
│   └── execute-plan.md
├── Dockerfile.adviser        # Docker build for Linux executable
├── deploy-skill.ts           # Deployment script
├── package.json
└── tsconfig.json
```

## Deployment

The `deploy-skill.ts` script copies:
- Self-contained executables (no Bun needed!)
- SKILL.md documentation
- Example usage files
- Workflow definitions

```bash
bun deploy-skill.ts /path/to/project
```

Deploys to:
```
project/
└── .agent/
    ├── skills/adviser/
    │   ├── adviser.exe
    │   ├── adviser
    │   ├── SKILL.md
    │   └── examples/
    └── workflows/
        ├── brainstorm.md
        ├── writing-plan.md
        └── execute-plan.md
```
