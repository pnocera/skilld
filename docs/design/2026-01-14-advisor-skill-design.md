# Design: Advisor Sub-Agent Skill for Antigravity

This document outlines the design for the **Advisor Skill**, which integrates Antigravity with Claude Code's headless mode to provide critical analysis and quality assurance.

## Overview

The Advisor Skill acts as a "second pair of eyes" in an Antigravity session. It leverages the advanced reasoning of Claude Code to review designs, implementation plans, and the final code against those plans.

## Architecture

- **Host**: Antigravity (Agentic IDE).
- **Core Logic**: TypeScript script executed via **Bun**.
- **Engine**: Claude Code CLI in headless mode (`claude --print`).
- **Authorization**: `--dangerously-skip-permissions` to allow the sub-agent unrestricted (but supervised) read access for verification tasks.

## Key Features

### 1. Personas (Task Types)
The skill supports three primary personas defined by specific system prompts:
- **Architect (`design-review`)**: Analyzes `.md` design files for edge cases, scalability, and logical consistency.
- **Strategist (`plan-analysis`)**: Reviews implementation plans to ensure they are complete, sequential, and address the design requirements.
- **Auditor (`code-verification`)**: Cross-references the current files/git diff against the implementation plan to ensure accuracy.

### 2. Context Handling
The skill allows passing context in two ways:
- **Direct Pipe**: Injecting file content directly into the prompt (best for single-file reviews).
- **Workspace Access**: Granting `read_file` and `list_files` permissions via the CLI so the sub-agent can explore as needed.

### 3. Output Routing
- **Automated Mode (`workflow`)**: Output is returned as a string for use in automated pipelines.
- **Human Review Mode (`human`)**: Output is written to a timestamped file in `docs/reviews/review-[TYPE]-[TIMESTAMP].md`.

## Data Flow
1. Antigravity invokes the `advisor` skill with a `taskType` and `mode`.
2. The Bun script prepares the specialized prompt.
3. The Bun script executes `claude --print -p [PROMPT] --dangerously-skip-permissions`.
4. The output is captured.
5. Depending on the `mode`, the output is either returned to Antigravity or written to a file.

## Error Handling
- **CLI Failures**: If Claude Code is not installed or the command fails, the script returns a clear error message to Antigravity.
- **Timeout**: A configurable timeout for the headless sub-agent to prevent hanging sessions.

## Testing Strategy
- **Unit Tests**: Test the prompt generation logic.
- **Integration Tests**: Verify the CLI bridge can successfully trigger a dummy Claude response.
