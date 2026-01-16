# Adviser Examples

## Quick Copy-Paste

```bash
# Design review
adviser design-review -m aisp -c @docs/design/my-design.md

# Plan analysis  
adviser plan-analysis -m aisp -c @docs/plan/my-plan.md

# Code verification
adviser code-verification -m aisp -c @src/feature.ts
```

## Output Modes

```bash
# AISP (AI-to-AI communication)
adviser design-review -m aisp -c @design.md

# JSON (pipeline integration)
adviser design-review -m workflow -c @design.md

# Human readable (saved to docs/reviews/)
adviser design-review -m human -c @design.md
```
