---
name: writing-plans
description: "Use when design is complete and you need detailed implementation tasks for engineers with zero codebase context - creates comprehensive implementation plans with exact file paths, complete code examples, and verification steps assuming engineer has minimal domain knowledge"
---
// turbo-all
# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Adviser Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `CHECKPOINT_TYPE` | plan-analysis | Adviser task to run |
| `OUTPUT_MODE` | aisp | Use AISP 5.1 format for AI-to-AI communication |
| `WHEN_TO_RUN` | once per phase | Single validation per major phase |

**AISP Awareness**: Before interpreting adviser output, reference `.agent/skills/adviser/aisp-quick-ref.md`. Key symbols:
- `⊢Verdict(approve|revise|reject)` — Final verdict
- `⊘` = critical, `◊⁻` = high, `◊` = medium, `◊⁺` = low severity
- `⟦Γ:Rules⟧` — Logic block with decision rules
- `⟦Ε⟧` — Evidence block with metrics (δ=density, φ=score, τ=tier)

## Protocol References

**Load these protocols** for plan writing guidance (use `/protocol-loader` for efficient loading):

| Protocol | Purpose in Plan Writing |
|----------|-------------------------|
| `{{AGENT_DIR}}/protocols/yagni.aisp` | Validate task necessity: `Required(w)≜∃e∈Evidence: e.strength > 0.8` |
| `{{AGENT_DIR}}/protocols/flow.aisp` | Task granularity: `bite=2..5min`, `write_plan≜λ(design).{design_to_tasks}` |
| `{{AGENT_DIR}}/protocols/solid.aisp` | Structure tasks by responsibility: one component = one task set |

**Key Protocol Rules for Plan Writing:**
```
;; From yagni.aisp - Task necessity check
∀w: w∈SpeculativeFeature ⇒ Action(Developer, w) ≡ Reject
∀w: (w∈UserFeature ∧ Required(w)) ⇒ Action(Developer, w) ≡ Implement

;; From flow.aisp - Task structure
write_plan≜λ(design).{
  tasks≜design_to_tasks(design,bite=2..5min)
  ∀t∈tasks:(has_exact_path(t) ∧ has_complete_code(t) ∧ has_verification(t))
  ⟨approved, iterations⟩≜adviser_loop(plan_analysis_config,tasks)
}

;; Quick reference for task granularity
Workflows≜{write_plan≔⟨loop≔plan-analysis,bite≔2-5 min,iter≔3⟩}
```

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

## Adviser Review (Once Per Phase)

Run adviser once after completing each major phase of the plan:

**After completing a phase:**
1. Save plan progress to: `docs/plans/YYYY-MM-DD-<feature-name>.md`
2. Run: `adviser plan-analysis --input docs/plans/YYYY-MM-DD-<feature-name>.md --mode aisp`
3. Read manifest from stdout path (format: `[Adviser] Output manifest: <path>`)
4. Parse manifest JSON to get asset paths, then read `.aisp` file for verdict
5. Review adviser feedback and address critical/high issues
6. Note any unresolved concerns in plan header
7. Continue to next phase

**Phases that trigger adviser:**
- After defining the architecture overview
- After completing all tasks for a component
- Before final handoff

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits
- **Run adviser once per phase, not in loops**
- Address critical issues, document remaining concerns
