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

1. **Discover protocols** from `protocols/` based on conversation context:
   - For design discussions: `solid.aisp`, `flow.aisp`
   - For implementation plans: `flow.aisp`, `yagni.aisp`
   - For code review: `solid.aisp`, `triangulation.aisp`

2. **Compose prompt** to `./tmp/adviser-prompt-review-<timestamp>.md`:
   - Include role/objective preamble
   - Add activity context (conversation review, focus areas)
   - Embed selected protocols in `<protocol>` tags
   - (Follow `skills/adviser/SKILL.md` for full template)

3. Run:
```bash
adviser --prompt-file ./tmp/adviser-prompt-review-<timestamp>.md \
        --input ./tmp/conversation-review-<timestamp>-<uuid8>.md \
        --mode aisp
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

## Protocol Selection Reference

Select protocols based on conversation context:

| Context | Recommended Protocols |
|---------|----------------------|
| Discussing architecture/design | `solid.aisp`, `flow.aisp` |
| Reviewing implementation plan | `flow.aisp`, `yagni.aisp` |
| Reviewing actual code | `solid.aisp`, `triangulation.aisp` |

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

3. Compose prompt with solid.aisp and flow.aisp protocols to ./tmp/adviser-prompt-review-1737200000.md

4. Run: adviser --prompt-file ./tmp/adviser-prompt-review-1737200000.md --input ./tmp/conversation-review-1737200000-a1b2c3d4.md

5. Report verdict and key findings to user
```
