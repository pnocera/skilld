# Plan Part 5: Packaging

**Focus**: Create standalone binaries for Windows and Linux.

### Task 8: Verification & Cleanup

**Step 1: Verify SDK Runtime Dependency**
Confirm that the advisor correctly detects the presence/absence of both `bun` and `claude` (Claude Code CLI).

NOTE: We are intentionally **NOT** providing standalone binary compilation (e.g., `bun build --compile`). Since the Agent SDK requires the Claude Code CLI and its authenticated environment at runtime, a self-contained binary is not currently feasible. The advisor must be run as a script via Bun.

**Step 2: Dry Run with Mock Context**
Run: `bun run skills/adviser/index.ts design-review human "Example context"`
Expected: Success with a generated review in `docs/reviews/`.

### Task 9: Documentation and Registration

**Files:**
- Create: `README.md`

**Step 1: Write Usage Docs**
Create root `README.md` explaining:
- **Antigravity Registration**: How to point Antigravity to `skills/adviser/index.ts`.
- **Prerequisites**: Bun runtime and `ANTHROPIC_API_KEY`.
- **Key Feature**: Robust analysis using the Claude Agent SDK and Claude Code runtime.
- **Config & Auth**: Requires `claude login` and optional `ANTHROPIC_API_KEY`.

**Step 2: Final Commit**
```bash
git add package.json README.md
git commit -m "chore: add build scripts and final documentation for Agent SDK integration"
```
