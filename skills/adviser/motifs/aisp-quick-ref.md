# AISP 5.1 Quick Reference for Callers

**Purpose:** Minimal symbols needed to interpret Adviser AISP output. The Reviewer AI uses the full spec to *generate* AISP; callers only need this subset to *interpret* verdicts.

---

## Verdict

```
⊢Verdict(approve)  — Proceed, no blocking issues
⊢Verdict(revise)   — Fix issues and re-submit
⊢Verdict(reject)   — Critical flaws, do not proceed
```

## Severity Tiers (◊)

| Symbol | Name | δ Range | Meaning |
|--------|------|---------|---------|
| `◊⁺⁺` | Platinum | δ ≥ 0.75 | Excellent |
| `◊⁺` | Gold | δ ≥ 0.60 | Good |
| `◊` | Silver | δ ≥ 0.40 | Acceptable |
| `◊⁻` | Bronze | δ ≥ 0.20 | **High severity issue** |
| `⊘` | Reject | δ < 0.20 | **Critical issue** |

**Decision rule:** Stop if `⊘` or `◊⁻` issues found.

## Key Blocks

| Block | Purpose | What to Look For |
|-------|---------|------------------|
| `⟦Γ:Rules⟧` | Decision logic | Contains verdict rules |
| `⟦Ε⟧` | Evidence | Metrics: δ (density), φ (score), τ (tier) |

## Evidence Metrics

```
⟦Ε⟧⟨
  δ≜0.81        — Density score (0-1), higher is better
  φ≜98          — Completeness (0-100)
  τ≜◊⁺⁺         — Overall tier
  ⊢Verdict(X)   — Final decision
⟩
```

## Quick Decision Tree

```
Parse ⟦Ε⟧ block:
  IF ⊢Verdict(reject) OR any ⊘ issues → STOP, escalate
  IF ⊢Verdict(revise) OR any ◊⁻ issues → REVISE and retry
  IF ⊢Verdict(approve) → PROCEED
```

---

*Full specification: `aisp-spec.md` (478 lines, for Reviewer AI only)*
