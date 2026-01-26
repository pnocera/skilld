#!/usr/bin/env bun
import { getPersonaPrompt } from './motifs';
import { executeClaude } from './runtimes';
import { handleOutput } from './output';
import type { PersonaType, OutputMode } from './types';
import { which } from 'bun';
import { join } from 'node:path';

// Constants
const DEFAULT_TIMEOUT_MS = 1800000; // 30 minutes
const MAX_INPUT_LENGTH = 500000;

function parseArgs(args: string[]): { taskType: PersonaType; mode: OutputMode; inputFile: string; outputFile?: string; outputDir?: string; timeout: number } {
  let taskType: PersonaType | null = null;
  let mode: OutputMode = 'aisp';  // Default to AISP for AI-to-AI communication
  let inputFile = '';
  let outputFile: string | undefined;
  let outputDir: string | undefined;
  let timeout = DEFAULT_TIMEOUT_MS;  // 30 minutes default

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg) continue; // Skip undefined args

    // Task type (first positional or first without flag)
    if (!taskType && !arg.startsWith('-')) {
      taskType = arg as PersonaType;
      continue;
    }

    // Mode
    if (arg === '--mode' || arg === '-m') {
      const modeArg = args[i + 1];
      if (modeArg) {
        mode = modeArg as OutputMode;
        i++;
      }
      continue;
    }

    // Timeout
    if (arg === '--timeout' || arg === '-t') {
      const timeoutArg = args[i + 1];
      if (timeoutArg) {
        timeout = parseInt(timeoutArg, 10);
        i++;
      }
      continue;
    }

    // Input file (required)
    if (arg === '--input' || arg === '-i') {
      const inputArg = args[i + 1];
      if (inputArg) {
        inputFile = inputArg;
        i++;
      }
      continue;
    }

    // Output file (optional)
    if (arg === '--output' || arg === '-o') {
      const outputArg = args[i + 1];
      if (outputArg) {
        outputFile = outputArg;
        i++;
      }
      continue;
    }

    // Output directory (optional)
    if (arg === '--output-dir') {
      const dirArg = args[i + 1];
      if (dirArg) {
        outputDir = dirArg;
        i++;
      }
      continue;
    }
  }

  if (!taskType) {
    throw new Error('Missing required taskType argument');
  }

  if (!inputFile) {
    throw new Error('Missing required --input (-i) argument');
  }

  return { taskType: taskType as PersonaType, mode, inputFile, outputFile, outputDir, timeout };
}

async function main() {
  const args = process.argv.slice(2);

  // 0. Runtime check
  const cliPath = await which('claude');
  if (!cliPath) {
    console.error('[Adviser] Error: Claude Code CLI (claude) not found. This is required by the Agent SDK.');
    console.error('Please install it: curl -fsSL https://claude.ai/install.sh | bash');
    process.exit(1);
  }

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    const helpText = `Usage: advise <taskType> --input <file> [options]

Arguments:  taskType     Required: design-review, plan-analysis, code-verification

Options:
  --input, -i <file>     Required: Path to input file containing context to analyze
  --output, -o <file>    Optional: Explicit output file path (auto-generated if omitted)
  --output-dir <dir>     Optional: Override output directory (default: docs/reviews/)
  --mode, -m <mode>      Output mode: aisp (default), human, or workflow (JSON)
  --timeout, -t <ms>     Timeout in milliseconds (default: ${DEFAULT_TIMEOUT_MS})
  --help, -h             Show this help message

Examples:
  advise design-review --input design-doc.md
  advise plan-analysis --input plan.md --output result.json --mode workflow
  advise code-verification --input src/auth.ts --output-dir ./reports/
`;
    console.log(helpText);
    process.exit(args.length > 0 ? 0 : 1);
  }

  let taskType: PersonaType;
  let mode: OutputMode;
  let inputFile: string;
  let outputFile: string | undefined;
  let outputDir: string | undefined;
  let timeout: number;

  try {
    ({ taskType, mode, inputFile, outputFile, outputDir, timeout } = parseArgs(args));
  } catch (e) {
    console.error(`Error: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  // Resolve input file path
  const resolvedInputFile = inputFile.startsWith('/') ? inputFile : join(process.cwd(), inputFile);

  // Validate input file exists
  const inputFileHandle = Bun.file(resolvedInputFile);
  if (!(await inputFileHandle.exists())) {
    console.error(`Error: Input file not found: ${resolvedInputFile}`);
    process.exit(1);
  }

  // Read context from input file
  let context: string;
  try {
    context = await inputFileHandle.text();
  } catch (e) {
    console.error(`Error reading input file ${resolvedInputFile}: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  // Validation
  const validTaskTypes: PersonaType[] = ['design-review', 'plan-analysis', 'code-verification'];
  if (!validTaskTypes.includes(taskType as PersonaType)) {
    console.error(`Invalid task type: ${taskType}. Must be one of: ${validTaskTypes.join(', ')}`);
    process.exit(1);
  }

  if (context.length === 0) {
    console.error('Error: Input file is empty.');
    process.exit(1);
  }

  if (context.length > MAX_INPUT_LENGTH) {
    console.error(`Error: Input file too large. Please limit input to ${MAX_INPUT_LENGTH.toLocaleString()} characters.`);
    process.exit(1);
  }

  try {
    console.log(`[Adviser] Starting ${taskType} in ${mode} mode...`);

    // Load system prompt (inject AISP spec if aisp mode)
    const systemPrompt = getPersonaPrompt(taskType as PersonaType, mode);

    // Execute via Agent SDK
    const analysisResult = await executeClaude(systemPrompt, context, taskType as PersonaType, timeout);

    // Handle Result Output
    const resultMsg = await handleOutput(analysisResult, mode, taskType as PersonaType, outputFile, outputDir);

    // Print output location
    console.log(resultMsg);

    process.exit(0);
  } catch (error) {
    console.error(`[Adviser] Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Run if main
if (import.meta.main) {
  main();
}
