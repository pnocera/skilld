/**
 * The persona determines the system prompt and analysis focus
 */
export type PersonaType = 'design-review' | 'plan-analysis' | 'code-verification';

/**
 * Output mode determines how the result is delivered
 * - 'workflow': JSON structured output for pipeline integration
 * - 'human': Markdown file saved to docs/reviews/
 * - 'aisp': AISP 5.1 Platinum Specification format for AI-to-AI communication
 */
export type OutputMode = 'workflow' | 'human' | 'aisp';

/**
 * Configuration options for the advisor
 */
export interface AdvisorOptions {
  taskType: PersonaType;
  mode?: OutputMode;
  context?: string;
  timeout?: number;
}

/**
 * Result of an advisor execution
 */
export interface AdvisorResult {
  success: boolean;
  output?: string;
  outputFile?: string;
  error?: string;
}
