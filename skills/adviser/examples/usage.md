# Adviser Examples

## Quick Copy-Paste

```bash
# Design review
adviser design-review --input docs/design/my-design.md --mode aisp

# Plan analysis  
adviser plan-analysis --input docs/plan/my-plan.md --mode aisp

# Code verification
adviser code-verification --input src/feature.ts --mode aisp
```

## Output Modes

```bash
# AISP (AI-to-AI communication)
adviser design-review --input design.md --mode aisp

# JSON (pipeline integration)
adviser design-review --input design.md --mode workflow

# Human readable (saved to docs/reviews/)
adviser design-review --input design.md --mode human
```

## Manifest Output

All modes output a manifest file for programmatic access:
```
[Adviser] Output manifest: /path/to/review.aisp.manifest.json
```

Read the manifest to find created assets:
```json
{
  "status": "success",
  "assets": [{ "type": "aisp", "format": "aisp", "path": "/path/to/review.aisp" }]
}
```

