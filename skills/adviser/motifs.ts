import architectPrompt from './motifs/architect.txt' with { type: 'text' };
import strategistPrompt from './motifs/strategist.txt' with { type: 'text' };
import auditorPrompt from './motifs/auditor.txt' with { type: 'text' };
import aispSpec from './motifs/aisp-spec.md' with { type: 'text' };
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

/** AISP 5.1 Platinum specification for structured output */
export { aispSpec };
