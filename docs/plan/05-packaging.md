# Plan Part 5: Packaging

**Focus**: Create standalone binaries for Windows and Linux.

### Task 8: Build Configuration

**Files:**
- Modify: `package.json`

**Step 1: Add compilation scripts**
Update `package.json` scripts section:

```json
{
  "scripts": {
    "build:win": "bun build --compile --target=bun-windows-x64 ./skills/adviser/index.ts --outfile dist/advisor.exe",
    "build:linux": "bun build --compile --target=bun-linux-x64 ./skills/adviser/index.ts --outfile dist/advisor",
    "build": "bun run build:win && bun run build:linux"
  }
}
```

NOTE: `bun build --compile` automatically handles local imports (including the `import with { type: 'text' }` assets) and bundles them into the single binary.

**Step 2: Build Binaries**
Run: `bun run build`

**Step 3: Verify Binaries**
Windows:
- Run: `.\dist\advisor.exe design-review workflow "test"`
- Expected: Output from Claude (or error if Claude not authenticated/installed on host).

Linux (if applicable/WSL):
- Run: `./dist/advisor design-review workflow "test"`

### Task 9: Documentation

**Files:**
- Create: `README.md`

**Step 1: Write Usage Docs**
Create root `README.md` explaining:
- Installation (Just download the binary).
- Prerequisite: `claude` CLI must be in PATH and authenticated.
- Usage examples for each persona.

**Step 2: Final Commit**
```bash
git add package.json README.md
git commit -m "chore: add build scripts and compilation targets"
```
