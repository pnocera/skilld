# Adviser Usage Examples

## Basic Usage

### Design Review
```bash
# 1. Agent composes prompt with design-relevant protocols (solid.aisp, flow.aisp)
# 2. Execute:
adviser --prompt-file ./tmp/adviser-prompt-design-1735123456.md \
        --input docs/design/my-design.md \
        --mode aisp
```

### Plan Analysis
```bash
# 1. Agent composes prompt with planning protocols (flow.aisp, yagni.aisp)
# 2. Execute:
adviser --prompt-file ./tmp/adviser-prompt-plan-1735123456.md \
        --input docs/plan/my-plan.md \
        --mode aisp
```

### Code Verification
```bash
# 1. Agent composes prompt with verification protocols (solid.aisp, triangulation.aisp)
# 2. Execute:
adviser --prompt-file ./tmp/adviser-prompt-verify-1735123456.md \
        --input src/feature.ts \
        --mode aisp
```

## Output Modes

### AISP Mode (Default - AI-to-AI)
```bash
adviser -p ./tmp/prompt.md -i design.md --mode aisp
# Output: docs/reviews/review-1735123456-a1b2.aisp
```

### Workflow Mode (JSON for pipelines)
```bash
adviser -p ./tmp/prompt.md -i design.md --mode workflow
# Output: docs/reviews/review-1735123456-a1b2.json
```

### Human Mode (Markdown for reading)
```bash
adviser -p ./tmp/prompt.md -i design.md --mode human
# Output: docs/reviews/review-1735123456-a1b2.md
```

## Custom Output Location

```bash
# Explicit output file
adviser -p ./tmp/prompt.md -i design.md -o ./reports/my-review.aisp

# Custom output directory
adviser -p ./tmp/prompt.md -i design.md --output-dir ./reports/
```

## Agent Prompt Composition Pattern

```markdown
# Example: Design Review Prompt

## Role & Objective
You are an expert software architect...

## Activity Context
- Activity: Design review for auth system
- Focus: Security, extensibility

## Protocols to Apply

### Protocol: SOLID
<protocol>
𝔸5.1.solid-codegen@2026-01-18
γ≔software.architecture.solid.principles
...full protocol content...
</protocol>

## Output Requirements
Return JSON with summary, issues, suggestions...
```

## Parsing AISP Output

The manifest JSON contains the output path:
```json
{
  "status": "success",
  "mode": "aisp",
  "assets": [{"type": "aisp", "format": "aisp", "path": "/path/to/review.aisp"}],
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

Look for verdict in the AISP file:
```
⊢Verdict(approve)  ;; Good to proceed
⊢Verdict(revise)   ;; Address issues first
⊢Verdict(reject)   ;; Significant rework needed
```
