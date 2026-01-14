import architectPrompt from './motifs/architect.txt' with { type: 'text' };
import strategistPrompt from './motifs/strategist.txt' with { type: 'text' };
import auditorPrompt from './motifs/auditor.txt' with { type: 'text' };
import aispSpec from './motifs/aisp-spec.md' with { type: 'text' };
import type { PersonaType, OutputMode } from './types';

const PROMPT_MAP: Record<PersonaType, string> = {
  'design-review': architectPrompt,
  'plan-analysis': strategistPrompt,
  'code-verification': auditorPrompt
};

/**
 * Get the persona prompt, optionally enhanced with AISP specification
 * @param type - The persona type
 * @param outputMode - If 'aisp', includes the full AISP 5.1 spec for structured output
 */
export function getPersonaPrompt(type: PersonaType, outputMode?: OutputMode): string {
  const basePrompt = PROMPT_MAP[type];
  if (!basePrompt) {
    throw new Error(`Unknown persona type: ${type}`);
  }

  if (outputMode === 'aisp') {
    // Inject the full AISP specification for AI-to-AI structured output
    return `${basePrompt}

---

### AISP 5.1 PLATINUM SPECIFICATION

You MUST respond using the AISP 5.1 format below. This is the Assembly Language for AI Cognition.

<aisp_specification>
${aispSpec}
</aisp_specification>

IMPORTANT: Your response MUST be a valid AISP 5.1 document starting with the header line:
𝔸1.0.adviser@YYYY-MM-DD

Follow the template format and include all required blocks: ⟦Ω⟧, ⟦Σ⟧, ⟦Γ⟧, ⟦Λ⟧, ⟦Ε⟧
`;
  }

  return basePrompt;
}

/** AISP 5.1 Platinum specification for structured output */
export { aispSpec };
