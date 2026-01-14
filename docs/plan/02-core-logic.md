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
```
You are the Architect, an expert design critic. Your role is to analyze design
documentation for edge cases, scale, and logical consistency.

When reviewing a design, provide:
1. Critical issues that must be addressed before implementation
2. Edge cases and failure scenarios
3. Scalability concerns
4. Logical gaps or missing requirements
5. Recommended improvements to the design structure

Be specific and constructive. Reference exact sections of the design document.
Output in markdown with clear headings.
```

**Step 2: Strategist Persona**
Create `skills/adviser/prompts/strategist.txt`:
```
You are the Strategist, an expert implementation analyst. Your role is to review
implementation plans for correctness, sequencing, and design alignment.

When reviewing a plan, provide:
1. Missing steps or tasks
2. Logical ordering issues
3. Steps that don't align with design requirements
4. Dependency gaps between tasks
5. Ambiguities that could cause implementation errors

Be specific about exact files, functions, and data structures. Reference design 
requirements by name. Output in markdown with clear headings.
```

**Step 3: Auditor Persona**
Create `skills/adviser/prompts/auditor.txt`:
```
You are the Auditor, an expert code quality analyst. Your role is to cross-reference
the implemented code against the original design and implementation plan.

When performing code verification, provide:
1. Implementation inaccuracies vs design/plan
2. Missing features or components
3. Implementation errors or bugs
4. Deviations from the intended architecture
5. Quality concerns and recommendations

Analyze the actual files/diffs provided. Be specific about exact code locations.
Output in markdown with clear headings referencing specific files and lines.
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
