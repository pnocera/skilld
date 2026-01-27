---
name: executing-plans
description: "Use when partner provides a complete implementation plan to execute in controlled batches with review checkpoints - loads plan, reviews critically, executes tasks in batches, reports for review between batches"
---

// turbo-all
## Executing Plans

## Overview

Load plan, review critically, execute tasks in batches, report for review between batches.

**Core principle:** Batch execution with checkpoints for architect review and adviser verification.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## Adviser Loop Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_ITERATIONS` | 2 | Maximum code-verification loops per batch |
| `PROTOCOLS` | solid.aisp, triangulation.aisp | Protocols for code verification |
| `OUTPUT_MODE` | aisp | Use AISP 5.1 format for AI-to-AI communication |
| `ON_MAX_REACHED` | stop | Halt and report to human |
| `SUCCESS_CRITERIA` | `⊢Verdict(approve)` or no `⊘`/`◊⁻` issues | When batch is approved |
| `CHECKSUM_SKIP` | false | Enable checksum-based skip for unchanged tasks |
| `PROGRESS_LOG` | false | Enable persistent progress logging to docs/execution/ |

**AISP Awareness**: Before interpreting adviser output, reference `skills/adviser/motifs/aisp-quick-ref.md`. Key symbols:
- `⊢Verdict(approve|revise|reject)` — Final verdict
- `⊘` = critical, `◊⁻` = high, `◊` = medium, `◊⁺` = low severity
- `⟦Γ:Rules⟧` — Logic block with decision rules
- `⟦Ε⟧` — Evidence block with metrics (δ=density, φ=score, τ=tier)

## Protocol References

**Load these protocols** for execution guidance (use `/protocol-loader` for efficient loading):

| Protocol | Purpose in Execution |
|----------|----------------------|
| `{{AGENT_DIR}}/protocols/solid.aisp` | Validate code quality: `validate_SOLID≜{SRP,OCP,LSP,ISP,DIP}` |
| `{{AGENT_DIR}}/protocols/triangulation.aisp` | Multi-witness verification: `Confidence ∝ |IndependentWitnesses|` |
| `{{AGENT_DIR}}/protocols/flow.aisp` | Execute batch logic: `execute_batch≜λ(batch).{FOR task∈batch...adviser_loop}` |

**Key Protocol Rules for Execution:**
```
;; From flow.aisp - Batch execution with verification
execute_batch≜λ(batch).{
  FOR task∈batch:{
    IF config.checksum_skip ∧ checksum_match(task): continue
    mark_in_progress(task) → execute(task) → mark_completed(task)
  }
  ⟨approved, iterations⟩≜adviser_loop(code_verification_config,files)
}

;; From solid.aisp - Code verification thresholds
τ_s≜7   ;; SRP: max 7 dependencies per component
τ_i≜5   ;; ISP: max 5 methods per interface

;; From triangulation.aisp - Confidence scoring
Threshold_Valid≜0.50
CalculateConfidence≜λ(ev_set).min(1.0, avg + max(0, (1-variance)*0.2))
```

Override defaults by announcing before batch: "This batch: MAX_ITERATIONS=10"

// turbo-all
## The Process

### Step 1: Load and Review Plan

**Announce phase:** "📋 Phase: Plan Review"

1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Create TodoWrite and proceed

### Step 2: Execute Batch (with adviser loop)
**Default: First 3 tasks**

**Announce phase:** "⚡ Phase: Execution Batch N" before starting each batch

```
batch_iteration = 0
DO:
  FOR each task in batch:
    1. **Checksum check (if CHECKSUM_SKIP=true):**
       - Compute: task content → MD5 hash
       - Check: if `.cache/task-<id>.md5` exists and matches, skip task
       - Announce: "⏭️ Task <N>: Skipped (unchanged)"
       - If skipped, mark as completed and continue to next task
    
    2. Mark as in_progress
    3. Follow each step exactly (plan has bite-sized steps)
    4. Run verifications as specified
    5. Mark as completed
    6. **Save checksum (if CHECKSUM_SKIP=true):** write hash to `.cache/task-<id>.md5`

  7. Create ./tmp directory if it doesn't exist
  8. Write batch files list to: ./tmp/batch-files-<uuid8>.md (where <uuid8> is 8 random hex chars)
  9. **Discover protocols** from `protocols/` for code verification:
     - `solid.aisp` — Code quality (SRP, OCP, LSP, ISP, DIP)
     - `triangulation.aisp` — Multi-pass verification
  10. **Compose prompt** to `./tmp/adviser-prompt-verify-<uuid8>.md`:
      - Include role/objective preamble
      - Add activity context (code verification, batch files)
      - Embed selected protocols in `<protocol>` tags
      - (Follow `skills/adviser/SKILL.md` for full template)
  11. Run: `adviser --prompt-file ./tmp/adviser-prompt-verify-<uuid8>.md --input ./tmp/batch-files-<uuid8>.md --mode aisp`
  12. Read manifest from stdout path (format: `[Adviser] Output manifest: <path>`)
  13. Parse manifest JSON to get asset paths, then read .aisp file for verdict
  14. IF adviser returns critical/high issues:
      - Fix identified issues
      - batch_iteration++
  15. ELSE: batch approved
UNTIL (batch approved) OR (batch_iteration >= MAX_ITERATIONS)

IF batch_iteration >= MAX_ITERATIONS:
  - Document unresolved adviser concerns in report
  - Set ON_MAX_REACHED behavior (stop/escalate)
```

### Step 3: Report
When batch complete:
- Show what was implemented
- Show verification output
- Show adviser loop summary: iterations, issues resolved, any remaining
- Say: "Ready for feedback."

### Step 3a: Log Progress (Optional, if PROGRESS_LOG=true)

After batch completion, persist execution state to enable recovery and auditing:

1. Create/append to: `docs/execution/progress-<plan-name>.txt`
2. Log entry format:
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

### Step 4: Continue
Based on feedback:
- Apply changes if needed
- Execute next batch
- Repeat until complete

### Step 5: Complete Development

**Announce phase:** "✅ Phase: Finalization"

After all tasks complete and verified:
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch
- Follow that skill to verify tests, present options, execute choice

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker mid-batch (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly
- **Adviser hits MAX_ITERATIONS with unresolved critical issues**

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- **Run adviser loop after each batch**
- Reference skills when plan says to
- Between batches: just report and wait
- Stop when blocked, don't guess
- **Trust the loop** - adviser catches issues; iterate rather than perfect first draft
