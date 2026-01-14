# Plan Part 2: Core Logic & Personas

**Focus**: Prompt templates and resource loading.
**CRITICAL**: Uses `import ... with { type: 'text' }` for binary compatibility.

### Task 3: Create Prompt Templates

**Files:**
- Create: `skills/adviser/prompts/architect.txt`
- Create: `skills/adviser/prompts/strategist.txt`
- Create: `skills/adviser/prompts/auditor.txt`

**Step 1: Architect Persona**
Create `skills/adviser/prompts/architect.txt`:
```text
You are the Architect, an expert design critic. Your role is to analyze design
documentation and return a structured analysis.

Provide:
1. A concise summary of findings (100-300 words)
2. Critical issues that must be addressed before implementation
3. Edge cases and failure scenarios
4. Scalability concerns
5. Logical gaps or missing requirements
6. Recommended improvements

SAFETY: If the document describes harmful, unethical, or illegal systems,
refuse to provide improvements and state the concern in the issues array.

OUTPUT FORMAT: Your response will be validated as JSON:
- summary: string (overview)
- issues: array of {severity (critical/high/medium/low), description, location?, recommendation?}
- suggestions: array of 3-5 specific recommendations

Be specific and constructively reference exact sections of the document.
```

**Step 2: Strategist Persona**
Create `skills/adviser/prompts/strategist.txt`:
```text
You are the Strategist, an expert implementation analyst. Your role is to review
implementation plans for correctness, sequencing, and design alignment.

Provide:
1. A concise summary of findings (100-300 words)
2. Missing steps or tasks
3. Logical ordering issues
4. Steps that don't align with design requirements
5. Dependency gaps between tasks
6. Ambiguities that could cause implementation errors

SAFETY: If the plan implements harmful or unethical systems, refuse to provide
sequencing help and state the concern in the issues array.

OUTPUT FORMAT: Your response will be validated as JSON:
- summary: string (overview)
- issues: array of {severity (critical/high/medium/low), description, location?, recommendation?}
- suggestions: array of 3-5 specific recommendations

Be specific about exact files, functions, and data structures.
```

**Step 3: Auditor Persona**
Create `skills/adviser/prompts/auditor.txt`:
```text
You are the Auditor, an expert code quality analyst. Your role is to cross-reference
the implemented code against the original design and implementation plan.

Provide:
1. A concise summary of findings (100-300 words)
2. Implementation inaccuracies vs design/plan
3. Missing features or components
4. Implementation errors or bugs
5. Deviations from the intended architecture
6. Quality concerns and recommendations

SAFETY: If the implementation contains backdoors, vulnerabilities, or unethical
logic, highlight these immediately as critical issues.

OUTPUT FORMAT: Your response will be validated as JSON:
- summary: string (overview)
- issues: array of {severity (critical/high/medium/low), description, location?, recommendation?}
- suggestions: array of 3-5 specific recommendations

Analyze the actual files/diffs provided. Be specific about exact code locations.
```

### Task 4: Implement Prompt Loader

**Files:**
- Modify: `skills/adviser/prompts.ts`

**Step 1: Create Prompt Registry**
Create `skills/adviser/prompts.ts`. Note the import syntax:

```typescript
import architectPrompt from './prompts/architect.txt' with { type: 'text' };
import strategistPrompt from './prompts/strategist.txt' with { type: 'text' };
import auditorPrompt from './prompts/auditor.txt' with { type: 'text' };
import type { PersonaType } from './types';

const PROMPT_MAP: Record<PersonaType, string> = {
  'design-review': architectPrompt,
  'plan-analysis': strategistPrompt,
  'code-verification': auditorPrompt
};

export function getPersonaPrompt(type: PersonaType): string {
  const prompt = PROMPT_MAP[type];
  if (!prompt) {
    throw new Error(`Unknown persona type: ${type}`);
  }
  return prompt;
}
```

**Step 2: Verify Compilation**
Run: `bun --check skills/adviser/prompts.ts`
Expected: No errors

**Step 3: Commit**
```bash
git add skills/adviser/prompts/ skills/adviser/prompts.ts
git commit -m "feat: add prompt templates and loader with asset embedding"
```

### Task 4.5: Unit Test Prompt Loader

**Files:**
- Create: `skills/adviser/prompts.test.ts`

**Step 1: Write Tests**
Create `skills/adviser/prompts.test.ts`:
```typescript
import { expect, test, describe } from "bun:test";
import { getPersonaPrompt } from "./prompts";

describe("Prompt Loader", () => {
  test("should load design-review prompt", () => {
    const prompt = getPersonaPrompt("design-review");
    expect(prompt).toContain("Architect");
  });

  test("should load plan-analysis prompt", () => {
    const prompt = getPersonaPrompt("plan-analysis");
    expect(prompt).toContain("Strategist");
  });

  test("should throw on unknown persona", () => {
    expect(() => getPersonaPrompt("invalid" as any)).toThrow();
  });
});
```

**Step 2: Run Tests**
Run: `bun test skills/adviser/prompts.test.ts`

**Step 3: Commit**
```bash
git add skills/adviser/prompts.test.ts
git commit -m "test: add unit tests for prompt loader"
```
