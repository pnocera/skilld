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
 * File-based input/output configuration
 */
export interface FileAssets {
  /** Path to input file containing context to analyze */
  inputFile: string;
  /** Path where output file should be written (auto-generated if omitted) */
  outputFile?: string;
  /** Base directory for output (defaults to docs/reviews/) */
  outputDir?: string;
}

/**
 * Configuration options for the advisor
 */
export interface AdvisorOptions {
  taskType: PersonaType;
  mode?: OutputMode;
  files: FileAssets;
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

/**
 * Asset entry in the output manifest
 */
export interface OutputAsset {
  type: 'review' | 'workflow' | 'aisp';
  format: 'md' | 'json' | 'aisp';
  path: string;
}

/**
 * Manifest file written alongside output for programmatic access
 */
export interface OutputManifest {
  status: 'success' | 'error';
  taskType: PersonaType;
  mode: OutputMode;
  assets: OutputAsset[];
  timestamp: string;
  error?: string;
}
