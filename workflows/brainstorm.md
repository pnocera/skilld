---
description: Use when creating or developing, before writing code or implementation plans - refines rough ideas into fully-formed designs through collaborative questioning, alternative exploration, and incremental validation.
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far.

## Adviser Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `PROTOCOLS` | solid.aisp, flow.aisp | Protocols for design review |
| `OUTPUT_MODE` | aisp | Use AISP 5.1 format for AI-to-AI communication |
| `WHEN_TO_RUN` | once, after complete design | Single validation at end |

**AISP Awareness**: Before interpreting adviser output, reference `skills/adviser/motifs/aisp-quick-ref.md`. Key symbols:
- `⊢Verdict(approve|revise|reject)` — Final verdict
- `⊘` = critical, `◊⁻` = high, `◊` = medium, `◊⁺` = low severity
- `⟦Γ:Rules⟧` — Logic block with decision rules
- `⟦Ε⟧` — Evidence block with metrics (δ=density, φ=score, τ=tier)

## Protocol References

**Load these protocols** for design guidance (use `/protocol-loader` for efficient loading):

| Protocol | Purpose in Brainstorming |
|----------|--------------------------|
| `{{AGENT_DIR}}/protocols/solid.aisp` | Validate architecture: SRP (single responsibility), OCP (extensibility), DIP (abstractions) |
| `{{AGENT_DIR}}/protocols/yagni.aisp` | Trim speculation: `∀w∈System: Required(w)` — every feature needs evidence |
| `{{AGENT_DIR}}/protocols/flow.aisp` | Guide brainstorming flow: `brainstorm≜λ(context).{understand→alternatives→sections→validate}` |

**Key Protocol Rules for Design:**
```
;; From solid.aisp - Component quality
∀c:Component:∃!r:ψ.responsibility(c)≡r  ;; SRP: single responsibility
∀e:Entity:∂𝒩(e)≡∅                       ;; OCP: closed nucleus, open extension

;; From yagni.aisp - Anti-speculation
∀w: w∈SpeculativeFeature ⇒ Action(Developer, w) ≡ Reject

;; From flow.aisp - Brainstorm structure
sections≜{architecture,components,data_flow,error,testing}
```

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

**Presenting the design:**

Present design in sections (200-300 words each). Cover: architecture, components, data flow, error handling, testing.

Check with user after each section: "Does this look right so far?"

## Final Adviser Review

After the complete design is drafted and user-approved:

1. Create `./tmp` directory if it doesn't exist
2. Write complete design to: `./tmp/design-complete-<uuid8>.md` (where `<uuid8>` is 8 random hex chars)
3. **Discover relevant protocols** from `protocols/` for design review:
   - `solid.aisp` — Architecture quality (SRP, OCP, DIP)
   - `flow.aisp` — Workflow structure validation
4. **Compose adviser prompt** to `./tmp/adviser-prompt-design-<uuid8>.md`:
   - Include role/objective preamble
   - Add activity context (design review, focus areas)
   - Embed selected protocols in `<protocol>` tags
   - Specify AISP output requirements
   - (Follow `skills/adviser/SKILL.md` for full template)
5. Run: `adviser --prompt-file ./tmp/adviser-prompt-design-<uuid8>.md --input ./tmp/design-complete-<uuid8>.md --mode aisp`
6. Read manifest from stdout path to find output `.aisp` file
7. Parse AISP output for verdict/issues
8. IF adviser returns critical/high issues:
   - Review and address concerns
   - Note any unresolved issues in final documentation
9. Proceed to documentation

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