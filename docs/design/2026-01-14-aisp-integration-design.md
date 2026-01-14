# AISP 5.1 Integration Design

**Date:** 2026-01-14  
**Spec:** `skills/adviser/motifs/aisp-spec.md` (copied from `aisp-open-core/AI_GUIDE.md`)

---

## Goal

Enable skills to output AISP 5.1 documents by providing the specification as a prompt motif. The LLM reads the spec and produces valid AISP — no parser infrastructure required.

---

## Approach

The AISP spec is a ~20KB markdown file that LLMs can read directly. By including it in skill prompts, the LLM learns the protocol and outputs structured AISP documents.

```typescript
import { aispSpec, getPersonaPrompt } from './motifs';

const prompt = `
${getPersonaPrompt('design-review')}

Output your analysis in AISP format following this specification:
${aispSpec}
`;
```

---

## Implementation

**Done:**
- [x] Copy `aisp-open-core/AI_GUIDE.md` → `skills/adviser/motifs/aisp-spec.md`
- [x] Export `aispSpec` from `motifs.ts`

**To do:**
- [ ] Update persona prompts to request AISP output format
- [ ] Validate LLM outputs contain required blocks (`⟦Ω⟧`, `⟦Σ⟧`, `⟦Γ⟧`, `⟦Λ⟧`, `⟦Ε⟧`)

---

## Output Format

Skills requesting AISP output will receive:

```
𝔸1.0.{skill}@YYYY-MM-DD
γ≔{context}
⟦Ω:Meta⟧{ invariants }
⟦Σ:Types⟧{ definitions }
⟦Γ:Rules⟧{ business rules }
⟦Λ:Funcs⟧{ operations }
⟦Ε⟧⟨δ≜N; φ≜N; τ≜◊X⟩
```

---

## Validation (Optional)

Simple regex check for required blocks:

```typescript
function hasRequiredBlocks(doc: string): boolean {
  return ['⟦Ω', '⟦Σ', '⟦Γ', '⟦Λ', '⟦Ε'].every(b => doc.includes(b));
}
```

No tokenizer/parser/builder infrastructure needed.
