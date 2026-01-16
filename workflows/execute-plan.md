---
name: executing-plans
description: Use when partner provides a complete implementation plan to execute in controlled batches with review checkpoints - loads plan, reviews critically, executes tasks in batches, reports for review between batches
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
| `MAX_ITERATIONS` | 5 | Maximum code-verification loops per batch |
| `CHECKPOINT_TYPE` | code-verification | Adviser task to run |
| `OUTPUT_MODE` | aisp | Use AISP 5.1 format for AI-to-AI communication |
| `ON_MAX_REACHED` | stop | Halt and report to human |
| `SUCCESS_CRITERIA` | `⊢Verdict(approve)` or no `⊘`/`◊⁻` issues | When batch is approved |

**AISP Awareness**: Before interpreting adviser output, reference `.agent/skills/adviser/aisp-quick-ref.md`. Key symbols:
- `⊢Verdict(approve|revise|reject)` — Final verdict
- `⊘` = critical, `◊⁻` = high, `◊` = medium, `◊⁺` = low severity
- `⟦Γ:Rules⟧` — Logic block with decision rules
- `⟦Ε⟧` — Evidence block with metrics (δ=density, φ=score, τ=tier)

Override defaults by announcing before batch: "This batch: MAX_ITERATIONS=10"

// turbo-all
## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Create TodoWrite and proceed

### Step 2: Execute Batch (with adviser loop)
**Default: First 3 tasks**

```
batch_iteration = 0
DO:
  FOR each task in batch:
    1. Mark as in_progress
    2. Follow each step exactly (plan has bite-sized steps)
    3. Run verifications as specified
    4. Mark as completed

  5. Run adviser: adviser code-verification -m aisp -c @<batch_files>
  6. IF adviser returns critical/high issues:
     - Fix identified issues
     - batch_iteration++
  7. ELSE: batch approved
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

### Step 4: Continue
Based on feedback:
- Apply changes if needed
- Execute next batch
- Repeat until complete

### Step 5: Complete Development

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
