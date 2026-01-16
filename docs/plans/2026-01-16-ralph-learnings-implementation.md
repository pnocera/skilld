# Ralph Inferno Learnings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the skilld execute-plan workflow with three valuable practices from Ralph Inferno: structured progress logging, phase tracking announcements, and checksum-based skip for idempotent re-runs.

**Architecture:** Update the `execute-plan.md` workflow documentation with new instructions for Antigravity. No TypeScript utilities—Antigravity natively supports file writes and shell commands, so the workflow instructions are sufficient. This is a **documentation-only change** to the workflow file.

**Why No TypeScript Utilities?**
- Markdown workflows are instructions for Antigravity, not executable code
- Antigravity can write files, compute checksums, and announce phases using its native tools
- Adding TypeScript utilities would require a CLI wrapper (like `adviser`) to be invokable, which is overkill for logging

**What About Stack Detection?**
- The `adviser code-verification` step already implicitly detects the stack and runs appropriate commands
- Adding explicit detection is duplicative; if needed in the future, it belongs in the adviser skill, not a separate utility

---

## Task 1: Add progress logging instructions to execute-plan.md

**Files:**
- Modify: `workflows/execute-plan.md`

**Step 1: Read current execute-plan.md structure**

Read: `workflows/execute-plan.md` to understand the current structure, particularly after "### Step 3: Report"

**Step 2: Insert progress logging section after Step 3**

Add the following after "### Step 3: Report" and before "### Step 4: Continue":

```markdown
### Step 3a: Log Progress (Optional)

After batch completion, persist execution state to enable recovery and auditing:

1. Create log file: `docs/execution/progress-<plan-name>.txt` (append mode)
2. Append entry with this structure:
   ```
   ============================================================
   Timestamp: <ISO8601>
   Batch: <N>
   Status: <started|completed|failed|retry>
   Tasks: <list of task names in batch>
   Verification: <pass|fail with summary>
   Issues: <any adviser concerns or blockers>
   ============================================================
   ```
3. This log survives session interruptions and enables resume from last successful batch

**When to skip:** If batch completed quickly with no issues, logging is optional.
```

**Step 3: Verify the section renders correctly**

Run: `grep -A 15 "Step 3a: Log Progress" workflows/execute-plan.md`
Expected: Shows the new progress logging section

---

## Task 2: Add phase tracking announcements to execute-plan.md

**Files:**
- Modify: `workflows/execute-plan.md`

**Step 1: Add phase announcement to Step 1**

In "### Step 1: Load and Review Plan", add as the first numbered item:

```markdown
1. **Announce phase:** "📋 Phase: Plan Review"
```

Renumber existing items (1 becomes 2, 2 becomes 3, etc.)

**Step 2: Add phase announcement to Step 2**

In "### Step 2: Execute Batch (with adviser loop)", add before the batch loop:

```markdown
**Announce phase:** "⚡ Phase: Execution Batch <N>" before starting each batch
```

**Step 3: Add phase announcement to Step 5**

In "### Step 5: Complete Development", add as the first line:

```markdown
**Announce phase:** "✅ Phase: Finalization"
```

**Step 4: Verify all phase announcements are present**

Run: `grep -c "Announce phase" workflows/execute-plan.md`
Expected: 3 (one for each major phase)

---

## Task 3: Add checksum-based skip instructions to execute-plan.md

**Files:**
- Modify: `workflows/execute-plan.md`

**Step 1: Add checksum skip logic to the batch loop**

In "### Step 2: Execute Batch (with adviser loop)", modify the FOR loop to include checksum checking. Replace the existing loop structure:

```markdown
```
batch_iteration = 0
DO:
  FOR each task in batch:
    1. **Checksum check (optional):**
       - Compute: `echo "<task_content>" | md5sum | cut -d' ' -f1`
       - Check: if `.cache/task-<id>.md5` exists and matches, skip task
       - Announce: "⏭️ Task <N>: Skipped (unchanged)"
       - If skipped, mark as completed and continue to next task
    
    2. Mark as in_progress
    3. Follow each step exactly (plan has bite-sized steps)
    4. Run verifications as specified
    5. Mark as completed
    6. **Save checksum:** `echo "<checksum>" > .cache/task-<id>.md5`

  7. Run adviser: adviser code-verification -m aisp -c @<batch_files>
  ...
```
```

**Step 2: Add configuration note for checksum skip**

Add to the "Adviser Loop Configuration" table:

| `CHECKSUM_SKIP` | false | Enable checksum-based skip for unchanged tasks |

**Step 3: Verify checksum instructions are in the loop**

Run: `grep -B 2 -A 10 "Checksum check" workflows/execute-plan.md`
Expected: Shows the checksum check logic inside the FOR loop

---

## Task 4: Update README with Ralph Inferno enhancements

**Files:**
- Modify: `README.md`

**Step 1: Read current README structure**

Read: `README.md` to find the appropriate location (before "## Contributing" or at the end of features section)

**Step 2: Add new section documenting the enhancements**

Insert before the final sections:

```markdown
## Execute-Plan Workflow Enhancements

The `execute-plan` workflow includes practices inspired by Ralph Inferno:

### Progress Logging
- Optional persistent logging of batch execution status
- Logs saved to `docs/execution/progress-<plan-name>.txt`
- Enables recovery from interrupted sessions

### Phase Announcements
- Clear phase transitions during execution:
  - 📋 Plan Review
  - ⚡ Execution Batch N
  - ✅ Finalization
- Improves visibility into long-running executions

### Checksum-Based Skip (Optional)
- Enable with `CHECKSUM_SKIP=true` before execution
- Skips unchanged tasks on re-runs
- Checksums stored in `.cache/task-<id>.md5`
- Clear cache with `rm -rf .cache/*.md5` to force full re-run
```

**Step 3: Verify the section renders**

Run: `grep -A 20 "Execute-Plan Workflow Enhancements" README.md`
Expected: Shows the new documentation section

---

## Task 5: Final verification and commit

**Files:**
- All modified files

**Step 1: Review all changes**

Run: `git diff workflows/execute-plan.md`
Expected: Shows additions for progress logging, phase tracking, and checksum skip

Run: `git diff README.md`
Expected: Shows new enhancements section

**Step 2: Verify workflow still renders correctly**

Read the full `workflows/execute-plan.md` to ensure the additions integrate smoothly with existing content.

**Step 3: Update .gitignore for cache directory**

Append to `.gitignore` if not already present:

```
# Checksum cache for idempotent re-runs
.cache/
```

**Step 4: Commit all changes**

```bash
git add workflows/execute-plan.md README.md .gitignore
git commit -m "feat: add progress logging, phase tracking, and checksum skip to execute-plan workflow

Inspired by Ralph Inferno patterns:
- Progress logging for recovery and auditing
- Phase announcements for visibility
- Optional checksum-based skip for idempotent re-runs

Documentation-only changes to workflow instructions."
```

---

## Summary

This plan implements 3 valuable enhancements from Ralph Inferno:

1. **Structured Progress Logging** - Optional persistent log of batch execution for recovery and auditing
2. **Phase Tracking Announcements** - Clear phase transitions for visibility during execution
3. **Checksum-Based Skip** - Optional idempotent re-runs by skipping unchanged tasks

**What was removed from the original proposal:**
- TypeScript utilities (can't be invoked from Markdown workflows)
- StackDetector (adviser already handles stack detection implicitly)
- Excessive per-file commits (consolidated into 1 logical commit)

**Architecture decision:** These features are implemented as **workflow instructions**, not code. Antigravity can write files, compute checksums (via shell), and announce phases natively. No additional executables or libraries are required.

