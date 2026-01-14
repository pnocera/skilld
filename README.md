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

- **Claude Code CLI** - Authenticated and configured
  ```bash
  # Install
  curl -fsSL https://claude.ai/install.sh | bash
  
  # Authenticate
  claude login
  
  # Accept non-interactive mode (required once)
  claude --dangerously-skip-permissions
  ```

The adviser uses the Claude CLI's stored credentials—no separate `ANTHROPIC_API_KEY` needed!

### On Build Machine (to compile executables)

- **Bun** (v1.1+) - For compilation
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

- **Docker** - For Linux cross-compilation (when building on Windows)

## Building

A comprehensive PowerShell build script is provided at the project root to orchestrate the entire build process.

```powershell
# Build both Windows and Linux executables (full process)
./build.ps1

# Build with specific options
./build.ps1 -Clean               # Remove old artifacts first
./build.ps1 -SkipTests           # Build without running bun test
./build.ps1 -WindowsOnly         # Skip Linux/Docker build
./build.ps1 -Deploy "C:\Path"    # Build and deploy immediately
```

The script performs the following steps:
1. **Prerequisite Check**: Validates Bun and Docker (for Linux builds).
2. **Clean**: (Optional) Removes existing `dist` directories.
3. **Install**: Runs `bun install` to ensure dependencies are up to date.
4. **Test**: Runs `bun test` to ensure build quality.
5. **Compile**: Uses `bun build --compile` to create standalone executables.
6. **Validate**: Checks artifact integrity and size.
7. **Deploy**: (Optional) Deploys to a target Antigravity project.

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
    │   ├── AISP_SPEC.md
    │   └── examples/
    └── workflows/
        ├── brainstorm.md
        ├── writing-plan.md
        └── execute-plan.md
```

## Antigravity Terminal Auto-Execution (Allowlist)

By default, Antigravity prompts for approval when running unknown executables like `adviser.exe`. To enable seamless execution without prompts:

### Option 1: Add to Allowlist (Recommended)

1. Open **Settings** in Antigravity IDE
2. Go to the **Agent** tab
3. Find **Terminal Command Auto Execution** section
4. Add the following to the **Allowlist**:
   - `.agent/skills/adviser/adviser.exe` (Windows)
   - `.agent/skills/adviser/adviser` (Linux/macOS)

### Option 2: Use "Turbo" Mode

Set **Terminal Command Auto Execution** policy to **Always Proceed / Turbo**. This auto-executes all commands except those in the denylist.

> **Note:** For PowerShell, allowlist entries match any contiguous subsequence of command tokens. For Unix shells, entries must match a prefix of the command's tokens.

### Option 3: Use `bun run` (Development)

During development, use `bun run` instead of the compiled executable:
```bash
bun run skills/adviser/index.ts design-review -m aisp -c @document.md
```

This leverages Bun as a recognized runtime, which may avoid prompts on some configurations.

