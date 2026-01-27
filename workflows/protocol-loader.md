---
description: "Load and reference AISP protocols dynamically based on task context - enables protocol-driven development with lazy loading optimization"
---

# Protocol Loader

## Overview

Dynamically load AISP protocols based on the current task context. This workflow optimizes context window usage by loading only relevant protocols.

**Reference:** See `{{AGENT_DIR}}/protocols/cost-analysis.aisp` for token budget optimization strategies.

## Protocol Registry

| Protocol | Use When | Token Cost |
|----------|----------|------------|
| `{{AGENT_DIR}}/protocols/flow.aisp` | Design reviews, brainstorming, workflow execution | ~2,550 |
| `{{AGENT_DIR}}/protocols/solid.aisp` | Code verification, architecture review | ~2,300 |
| `{{AGENT_DIR}}/protocols/yagni.aisp` | Feature scoping, anti-speculation checks | ~660 |
| `{{AGENT_DIR}}/protocols/triangulation.aisp` | Multi-source verification, evidence gathering | ~1,500 |
| `{{AGENT_DIR}}/protocols/aisp5.1.aisp` | Creating new protocols, requirements writing | ~1,800 |
| `{{AGENT_DIR}}/protocols/cost-analysis.aisp` | Optimizing protocol usage | ~1,200 |

## Loading Strategy

### Strategy 1: Task-Based Loading

```
IF task ∈ {design-review, brainstorm}:
  LOAD {{AGENT_DIR}}/protocols/flow.aisp, {{AGENT_DIR}}/protocols/solid.aisp, {{AGENT_DIR}}/protocols/yagni.aisp
  
IF task ∈ {code-verification, implementation}:
  LOAD {{AGENT_DIR}}/protocols/solid.aisp, {{AGENT_DIR}}/protocols/triangulation.aisp
  
IF task ∈ {plan-analysis}:
  LOAD {{AGENT_DIR}}/protocols/flow.aisp, {{AGENT_DIR}}/protocols/yagni.aisp
  
IF task ∈ {requirements-writing}:
  LOAD {{AGENT_DIR}}/protocols/aisp5.1.aisp
```

### Strategy 2: Section Extraction

For minimal context usage, extract only needed sections:

```
;; For verdict interpretation:
EXTRACT ⟦Γ:Rules⟧, ⟦Σ:QuickRef⟧ FROM {{AGENT_DIR}}/protocols/flow.aisp

;; For issue severity understanding:
EXTRACT Severity≜{...} FROM {{AGENT_DIR}}/protocols/flow.aisp

;; For code quality rules:
EXTRACT validate_SOLID FROM {{AGENT_DIR}}/protocols/solid.aisp
```

### Strategy 3: Key Principle Injection

For even lighter footprint, inject only core principles as inline context:

```markdown
**Active Protocols:**
- SOLID: SRP (single responsibility), OCP (open/closed), LSP (substitution), ISP (interface segregation), DIP (dependency inversion)
- YAGNI: Only implement when Required(evidence.strength > 0.8)
- Triangulation: Confidence ∝ |IndependentWitnesses|; Threshold_Valid = 0.50
- Flow: Verdict{approve: critical=0∧high≤2, revise: critical=0∧high>2, reject: critical>0}
```

## The Process

### Step 1: Identify Task Context

Determine which protocols are relevant:
1. What type of work? (design/plan/code/requirements)
2. What quality concerns? (architecture/correctness/lean)
3. What verification needs? (single-pass/multi-witness)

### Step 2: Load Protocols

// turbo
```bash
# View protocols directory
ls -la {{AGENT_DIR}}/protocols/
```

Based on Step 1, read relevant protocol files:
```bash
# Example: Load for design review
cat {{AGENT_DIR}}/protocols/flow.aisp
cat {{AGENT_DIR}}/protocols/solid.aisp
```

### Step 3: Extract Key Rules

Parse loaded protocols for actionable rules:

**From flow.aisp:**
- Verdict logic: `⟦Γ:Rules⟧`
- Persona mapping: `⟦Σ:QuickRef⟧.Personas`
- Severity tiers: `⊘≺◊⁻≺◊≺◊⁺`

**From solid.aisp:**
- Validation functions: `validate_SRP`, `validate_OCP`, etc.
- Thresholds: `τ_s≜7` (SRP link limit), `τ_i≜5` (ISP method limit)

**From yagni.aisp:**
- Core invariant: `∀w∈System: Required(w)`
- Anti-speculation: `w∈SpeculativeFeature ⇒ Action ≡ Reject`

### Step 4: Apply to Current Task

Reference extracted rules when:
- Making design decisions → Check SOLID/YAGNI constraints
- Interpreting adviser output → Use flow.aisp verdict logic
- Reviewing evidence → Apply triangulation confidence scoring

## Integration with Other Workflows

### With `/brainstorm`:
```
BEFORE presenting design sections:
  LOAD {{AGENT_DIR}}/protocols/solid.aisp → validate architecture against SOLID
  LOAD {{AGENT_DIR}}/protocols/yagni.aisp → trim speculative features
```

### With `/writing-plan`:
```
BEFORE creating tasks:
  LOAD {{AGENT_DIR}}/protocols/flow.aisp → understand task granularity (bite=2-5min)
  LOAD {{AGENT_DIR}}/protocols/yagni.aisp → ensure Required(each_task)
```

### With `/execute-plan`:
```
DURING code-verification:
  LOAD {{AGENT_DIR}}/protocols/solid.aisp → validate code quality
  LOAD {{AGENT_DIR}}/protocols/triangulation.aisp → multi-source verification if complex
```

## Quick Reference Commands

```bash
# Load all protocols (one-time, ~8.8k tokens)
cat {{AGENT_DIR}}/protocols/*.aisp

# Load minimal for design review (~5.5k tokens)
cat {{AGENT_DIR}}/protocols/flow.aisp {{AGENT_DIR}}/protocols/solid.aisp {{AGENT_DIR}}/protocols/yagni.aisp

# Load minimal for code verification (~3.8k tokens)
cat {{AGENT_DIR}}/protocols/solid.aisp {{AGENT_DIR}}/protocols/triangulation.aisp

# Extract just quick reference sections
grep -A 50 "⟦Σ:QuickRef⟧" {{AGENT_DIR}}/protocols/flow.aisp
```

## Remember

- **Lazy load** - Don't load all protocols upfront
- **Section extract** - Use only what you need from each protocol
- **Principle inject** - For very light tasks, inline key rules
- **Trust the formalization** - Protocols encode proven patterns; follow them
