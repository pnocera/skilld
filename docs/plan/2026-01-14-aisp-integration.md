# AISP 5.1 Integration Plan

**Goal:** Enable AISP output from skills by including the spec as a prompt motif.

---

## Completed

- [x] **Task 1:** Copy spec to motifs folder
  ```bash
  Copy-Item "aisp-open-core\AI_GUIDE.md" "skills\adviser\motifs\aisp-spec.md"
  ```

- [x] **Task 2:** Export from motifs.ts
  ```typescript
  import aispSpec from './motifs/aisp-spec.md' with { type: 'text' };
  export { aispSpec };
  ```

- [x] **Task 3:** Update persona prompts to support AISP output
  - `architect.txt` — Added AISP format example with `⟦Ω⟧`, `⟦Σ⟧`, `⟦Γ⟧`, `⟦Λ⟧`, `⟦Ε⟧`
  - `strategist.txt` — Added AISP format for plan analysis
  - `auditor.txt` — Added AISP format for code verification

- [x] **Task 4:** Test motifs loader
  ```bash
  bun test skills/adviser/motifs.test.ts
  # 3 pass, 0 fail
  ```

---

## Usage

```typescript
import { aispSpec, getPersonaPrompt } from './motifs';

// Include spec in prompt when AISP output is needed
const prompt = `${getPersonaPrompt('design-review')}\n\nUse AISP format.\n\n${aispSpec}`;
```

---

## Files Changed

| File | Change |
|------|--------|
| `skills/adviser/motifs/aisp-spec.md` | New — AISP 5.1 spec (copied) |
| `skills/adviser/motifs.ts` | Added `aispSpec` export |
| `skills/adviser/motifs/architect.txt` | Added AISP output format |
| `skills/adviser/motifs/strategist.txt` | Added AISP output format |
| `skills/adviser/motifs/auditor.txt` | Added AISP output format |
