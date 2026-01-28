<p align="center">
  <img src="assets/adviser.jpg" width="100%" alt="Skilld Adviser Banner">
</p>

# Adviser Skill for Claude Code

Protocol-driven analysis and quality assurance tool using the Claude Agent SDK.

## Features

**Dynamic protocol-based analysis:**
- Consuming agents discover relevant protocols from `protocols/`
- Compose custom prompts with selected protocols
- Execute analysis using the Claude Agent SDK
- Output in AISP 5.1 format for AI-to-AI communication
- **Bayesian calibration and optimal CoT scaling** (based on arXiv:2507.11768)

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

This copies the executables to `.claude/skills/adviser/` in your project.

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
7. **Deploy**: (Optional) Deploys to a target Claude Code project.

## Usage

```bash
adviser --prompt-file <path> --input <file> [options]
```

**Parameters:**
- `--prompt-file, -p`: Path to system prompt file (composed by calling agent)
- `--input, -i`: Path to input file containing content to analyze
- `--mode, -m`: `aisp` (default), `human`, or `workflow` (JSON)
- `--output, -o`: Optional explicit output file path
- `--output-dir`: Optional output directory (default: docs/reviews/)
- `--timeout, -t`: Execution timeout in milliseconds (default: 1800000)

**Example:**
```bash
# Compose a prompt with protocols (agent does this dynamically)
cat > ./tmp/prompt.md << 'EOF'
# Design Review Prompt
## Role & Objective
You are an expert software architect...

## Protocols
<protocol>
[content from solid.aisp]
</protocol>
EOF

# Run adviser
adviser --prompt-file ./tmp/prompt.md --input design-doc.md --mode aisp
```

**Output:**
- AISP mode: `.aisp` file saved to `docs/reviews/` with AISP 5.1 format
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
│   ├── SKILL.md              # Skill documentation (protocol discovery guide)
│   ├── build.ps1             # Build script for executables
│   ├── dist/                 # Compiled executables
│   │   ├── adviser.exe       # Windows x64
│   │   └── adviser           # Linux x64
│   ├── index.ts              # Main entry point
│   ├── runtimes.ts           # Claude SDK execution
│   ├── output.ts             # Output formatting
│   ├── schemas.ts            # Zod validation schemas
│   ├── types.ts              # Type definitions
│   └── motifs/               # Reference materials
│       ├── aisp-spec.md      # Full AISP 5.1 specification
│       └── aisp-quick-ref.md # Quick reference for parsing
├── protocols/                # AISP protocol specifications
│   ├── solid.aisp            # SOLID principles
│   ├── flow.aisp             # Workflow logic
│   ├── yagni.aisp            # Lean development
│   └── triangulation.aisp    # Multi-witness verification
├── workflows/                # Agent workflows
```

## Deployment

The `deploy-skill.ts` script copies:
- Self-contained executables (no Bun needed!)
- SKILL.md documentation
- Example usage files
- Workflow definitions
- **AISP protocol specifications** (for protocol-driven development)

```bash
bun deploy-skill.ts /path/to/project
```

Deploys to:
```
project/
└── .agent/ (or .claude/)
    ├── skills/adviser/
    │   ├── scripts/
    │   │   ├── adviser.exe
    │   │   └── adviser
    │   ├── SKILL.md
    │   ├── aisp-spec.md
    │   └── examples/
    ├── workflows/ (or commands/)
    │   ├── brainstorm.md
    │   ├── writing-plan.md
    │   ├── execute-plan.md
    │   ├── protocol-loader.md        # NEW: Dynamic protocol loading
    │   ├── protocol-driven-verification.md  # NEW: Formal verification
    │   └── review-conversation.md
    └── protocols/                    # NEW: AISP protocol specifications
        ├── aisp5.1.aisp              # EARS requirements syntax
        ├── flow.aisp                 # Adviser-driven workflow logic
        ├── solid.aisp                # SOLID principles formalization
        ├── triangulation.aisp        # Multi-witness verification
        ├── yagni.aisp                # Lean development rules
        └── cost-analysis.aisp        # Token budget optimization
```

**Note:** Protocol paths in workflows use `{{AGENT_DIR}}/protocols/` which is automatically replaced with `.agent` or `.claude` during deployment.

## Claude Code Terminal Auto-Execution

By default, Claude Code may prompt for approval when running unknown executables like `adviser`.

### Terminal Command Approval

When Claude Code attempts to run the `adviser`, you will be prompted to allow the execution. You can use the `--dangerously-skip-permissions` flag when starting `claude` to skip these prompts for a session, though this should be used with caution.

For the most secure experience, always review the command before approving.

### Option 3: Use `bun run` (Development)

During development, use `bun run` instead of the compiled executable:
```bash
bun run skills/adviser/index.ts design-review -m aisp -c @document.md
```

This leverages Bun as a recognized runtime, which may avoid prompts on some configurations.

## Execute-Plan Workflow Enhancements

The `execute-plan` workflow includes practices inspired by [Ralph Inferno](https://github.com/snarktank/ralph):

### Phase Announcements
Clear phase transitions during execution for improved visibility:
- 📋 **Plan Review** - Loading and reviewing the plan
- ⚡ **Execution Batch N** - Executing each batch
- ✅ **Finalization** - Completing development

### Progress Logging (Optional)
Enable with `PROGRESS_LOG=true` before execution:
- Persistent logging of batch execution status
- Logs saved to `docs/execution/progress-<plan-name>.txt`
- Enables recovery from interrupted sessions
- Captures tasks, verification results, and issues

### Checksum-Based Skip (Optional)
Enable with `CHECKSUM_SKIP=true` before execution:
- Skips unchanged tasks on re-runs for idempotent execution
- Checksums stored in `.cache/task-<id>.md5`
- Clear cache with `rm -rf .cache/*.md5` to force full re-run
