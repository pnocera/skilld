---
description: "Use when creating or developing, before writing code or implementation plans - refines rough ideas into fully-formed designs through collaborative questioning, alternative exploration, and incremental validation."
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far.

## Adviser Loop Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_ITERATIONS` | 3 | Maximum design-review loops per section |
| `CHECKPOINT_TYPE` | design-review | Adviser task to run |
| `OUTPUT_MODE` | aisp | Use AISP 5.1 format for AI-to-AI communication |
| `ON_MAX_REACHED` | escalate | Report unresolved issues to human |
| `SUCCESS_CRITERIA` | `⊢Verdict(approve)` or no `⊘`/`◊⁻` issues | When to proceed |

**AISP Awareness**: Before interpreting adviser output, reference `.agent/skills/adviser/aisp-quick-ref.md`. Key symbols:
- `⊢Verdict(approve|revise|reject)` — Final verdict
- `⊘` = critical, `◊⁻` = high, `◊` = medium, `◊⁺` = low severity
- `⟦Γ:Rules⟧` — Logic block with decision rules
- `⟦Ε⟧` — Evidence block with metrics (δ=density, φ=score, τ=tier)

Override defaults by announcing at section start: "This section: MAX_ITERATIONS=5"

## The Process

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message - if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**
- Search the web using searxng mcp tools to identify potential libraries which could help in designing a solution
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the design (with adviser loop):**

For each design section:

```
iteration = 0
DO:
  1. Present section (200-300 words)
  2. Run: adviser design-review -m aisp -c @<section_content>
  3. IF adviser returns critical/high issues:
     - Revise section based on feedback
     - iteration++
  4. ELSE: section approved
UNTIL (section approved) OR (iteration >= MAX_ITERATIONS)

IF iteration >= MAX_ITERATIONS:
  - Document unresolved adviser concerns
  - Escalate to human: "Adviser flagged issues I couldn't resolve. Review needed."
ELSE:
  - Proceed to next section
```

Cover in sections: architecture, components, data flow, error handling, testing

## After the Design

**Documentation:**
- Write the validated design to `docs/design/YYYY-MM-DD-<topic>-design.md`
- Include adviser loop summary: iterations per section, any escalations
- Write clearly and very detailed

## Key Principles

- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **ASE ( Antoine de Saint-Exupery )** - A designer knows he has achieved perfection not when there is nothing left to add, but when there is nothing left to take away.
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design in sections, validate each with adviser
- **Be flexible** - Go back and clarify when something doesn't make sense
- **Trust the loop** - Let adviser catch issues; iterate rather than perfect first draft