---
description: "Export the current conversation to markdown and run adviser review - use anytime to get critical feedback on conversation progress"
---

# Review Conversation

## Overview

Export the current conversation context to a markdown file and run the adviser for critical analysis. Use this anytime during a conversation to get feedback on:
- Design discussions
- Implementation approaches
- Problem-solving progress
- Decision quality

## Protocol References

**Load these protocols** for review guidance (use `/protocol-loader` for efficient loading):

| Protocol | Purpose in Review |
|----------|-------------------|
| `{{AGENT_DIR}}/protocols/triangulation.aisp` | Multi-perspective validation: `Confidence ∝ |IndependentWitnesses|` |
| `{{AGENT_DIR}}/protocols/flow.aisp` | Verdict interpretation: `approve\|revise\|reject` logic |
| `{{AGENT_DIR}}/protocols/solid.aisp` | Architecture quality checklist: SOLID principles |

**Key Protocol Rules for Review:**
```
;; From triangulation.aisp - Confidence scoring
Rule_Det≜λ(e).e.witness.type≡Deterministic ⇒ e.score ∈ [0.90, 1.0]
Rule_LLM≜λ(e).e.witness.type∈{Local,Regional,Global} ⇒ e.score ∈ [0.40, 0.70]
Threshold_Valid≜0.50  ;; Minimum confidence for valid assertion

;; From flow.aisp - Verdict logic
Verdict_From_Critical≜∀a:critical_count(a)>0 ⇒ verdict(a)≡reject
Verdict_From_High≜∀a:high_count(a)>2 ⇒ verdict(a)≡revise
Verdict_Approve≜∀a:critical_count(a)=0 ∧ high_count(a)=0 ⇒ verdict(a)≡approve
```

## The Process

### Step 1: Export Conversation

Write the relevant conversation context to a temporary markdown file:

```
1. Create ./tmp directory if it doesn't exist
2. Create file: ./tmp/conversation-review-<timestamp>-<uuid8>.md (where <uuid8> is 8 random hex chars)
3. Include:
   - Current topic/objective being discussed
   - Key decisions made
   - Important code snippets or designs mentioned
   - Open questions or concerns
4. Format as clean markdown with headers for each section
```

### Step 2: Run Adviser

```bash
# Run adviser in default AISP mode
adviser design-review --input ./tmp/conversation-review-<timestamp>-<uuid8>.md
```

### Step 3: Parse Results

1. Read manifest from stdout: `[Adviser] Output manifest: <path>`
2. Parse manifest JSON to get AISP file path
3. Read AISP output and interpret:
   - `⊢Verdict(approve|revise|reject)` — Overall verdict
   - `⊘` = critical, `◊⁻` = high, `◊` = medium, `◊⁺` = low severity
   - Focus on critical (`⊘`) and high (`◊⁻`) issues first

### Step 4: Report

Summarize findings to the user:
- Verdict and confidence score
- Critical/high issues that need attention
- Suggestions for improvement
- Recommended next steps

## When to Use

- **Mid-design**: Get feedback on evolving design
- **Before implementation**: Validate approach before coding
- **When stuck**: Get external perspective on problem
- **After major decision**: Verify decision quality
- **Code review prep**: Pre-review before human review

## Task Types

Choose the appropriate adviser task type based on context:

| Context | Task Type |
|---------|-----------|
| Discussing architecture/design | `design-review` |
| Reviewing implementation plan | `plan-analysis` |
| Reviewing actual code | `code-verification` |

## Example

```
User: "Review our conversation so far"

1. Ensure ./tmp exists: mkdir -p ./tmp
2. Write to ./tmp/conversation-review-1737200000-a1b2c3d4.md:
   ---
   # Conversation Review: OTFUSE Markdown VFS Design
   
   ## Objective
   Design a dual-mount FUSE architecture for on-demand markdown conversion.
   
   ## Key Decisions
   - Use dual-mount strategy by default
   - Shared backend between mounts
   - TTL-based cache invalidation
   
   ## Current Design
   [extracted design content]
   
   ## Open Questions
   - Cache consistency approach?
   ---

3. Run: adviser design-review --input ./tmp/conversation-review-1737200000-a1b2c3d4.md

4. Report verdict and key findings to user
```
