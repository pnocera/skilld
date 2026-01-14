/**
 * The persona determines the system prompt and analysis focus
 */
export type PersonaType = 'design-review' | 'plan-analysis' | 'code-verification';

/**
 * Output mode determines how the result is delivered
 */
export type OutputMode = 'workflow' | 'human';

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
