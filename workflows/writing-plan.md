---
name: writing-plans
description: Use when design is complete and you need detailed implementation tasks for engineers with zero codebase context - creates comprehensive implementation plans with exact file paths, complete code examples, and verification steps assuming engineer has minimal domain knowledge
---
// turbo-all
# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Adviser Loop Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_ITERATIONS` | 3 | Maximum plan-analysis loops before handoff |
| `CHECKPOINT_TYPE` | plan-analysis | Adviser task to run |
| `OUTPUT_MODE` | aisp | Use AISP 5.1 format for AI-to-AI communication |
| `ON_MAX_REACHED` | continue | Document concerns and proceed |
| `SUCCESS_CRITERIA` | `⊢Verdict(approve)` or no `⊘`/`◊⁻` issues | When plan is approved |

**AISP Awareness**: Before interpreting adviser output, reference `.agent/skills/adviser/aisp-quick-ref.md`. Key symbols:
- `⊢Verdict(approve|revise|reject)` — Final verdict
- `⊘` = critical, `◊⁻` = high, `◊` = medium, `◊⁺` = low severity
- `⟦Γ:Rules⟧` — Logic block with decision rules
- `⟦Ε⟧` — Evidence block with metrics (δ=density, φ=score, τ=tier)

Override defaults by announcing: "This plan: MAX_ITERATIONS=5"

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Adviser Review:** [Loop iterations, unresolved concerns if any]

---
```

## Task Structure

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
```

## Pre-Handoff Adviser Loop

Before offering execution choice, validate the complete plan:

```
iteration = 0
DO:
  1. Run: adviser plan-analysis -m aisp -c @<plan_file>
  2. IF adviser returns critical/high issues:
     - Revise plan based on feedback
     - iteration++
  3. ELSE: plan approved
UNTIL (plan approved) OR (iteration >= MAX_ITERATIONS)

IF iteration >= MAX_ITERATIONS:
  - Add "Adviser Review" note to plan header with unresolved concerns
  - Proceed to handoff (ON_MAX_REACHED=continue)
```

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits
- **Run adviser loop before handoff**
- **Trust the loop** - adviser catches issues; iterate rather than perfect first draft
