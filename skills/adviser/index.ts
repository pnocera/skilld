#!/usr/bin/env bun
import { executeClaude } from './runtimes';
import { handleOutput } from './output';
import type { OutputMode } from './types';
import { which } from 'bun';
import { join } from 'node:path';

// Constants
const DEFAULT_TIMEOUT_MS = 1800000; // 30 minutes
const MAX_INPUT_LENGTH = 500000;

function parseArgs(args: string[]): {
  promptFile: string;
  mode: OutputMode;
  inputFile: string;
  outputFile?: string;
  outputDir?: string;
  timeout: number
} {
  let promptFile = '';
  let mode: OutputMode = 'aisp';  // Default to AISP for AI-to-AI communication
  let inputFile = '';
  let outputFile: string | undefined;
  let outputDir: string | undefined;
  let timeout = DEFAULT_TIMEOUT_MS;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    // Prompt file (required - replaces taskType)
    if (arg === '--prompt-file' || arg === '-p') {
      const promptArg = args[i + 1];
      if (promptArg) {
        promptFile = promptArg;
        i++;
      }
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

  if (!promptFile) {
    throw new Error('Missing required --prompt-file (-p) argument');
  }

  if (!inputFile) {
    throw new Error('Missing required --input (-i) argument');
  }

  return { promptFile, mode, inputFile, outputFile, outputDir, timeout };
}

async function main() {
  const args = process.argv.slice(2);

  // 0. Runtime check
  const cliPath = await which('claude');
  if (!cliPath) {
    console.error('[Adviser] Error: Claude Code CLI (claude) not found.');
    console.error('Please install it: curl -fsSL https://claude.ai/install.sh | bash');
    process.exit(1);
  }

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    const helpText = `Usage: adviser --prompt-file <path> --input <file> [options]

Required:
  --prompt-file, -p <file>  Path to system prompt file (composed by calling agent)
  --input, -i <file>        Path to input file containing content to analyze

Options:
  --output, -o <file>    Optional: Explicit output file path (auto-generated if omitted)
  --output-dir <dir>     Optional: Override output directory (default: docs/reviews/)
  --mode, -m <mode>      Output mode: aisp (default), human, or workflow (JSON)
  --timeout, -t <ms>     Timeout in milliseconds (default: ${DEFAULT_TIMEOUT_MS})
  --help, -h             Show this help message

Examples:
  adviser --prompt-file ./tmp/prompt.md --input design-doc.md
  adviser -p ./tmp/prompt.md -i plan.md --output result.json --mode workflow
`;
    console.log(helpText);
    process.exit(args.length > 0 ? 0 : 1);
  }

  let promptFile: string;
  let mode: OutputMode;
  let inputFile: string;
  let outputFile: string | undefined;
  let outputDir: string | undefined;
  let timeout: number;

  try {
    ({ promptFile, mode, inputFile, outputFile, outputDir, timeout } = parseArgs(args));
  } catch (e) {
    console.error(`Error: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  // Resolve file paths
  const resolvedPromptFile = promptFile.startsWith('/') ? promptFile : join(process.cwd(), promptFile);
  const resolvedInputFile = inputFile.startsWith('/') ? inputFile : join(process.cwd(), inputFile);

  // Validate prompt file exists
  const promptFileHandle = Bun.file(resolvedPromptFile);
  if (!(await promptFileHandle.exists())) {
    console.error(`Error: Prompt file not found: ${resolvedPromptFile}`);
    process.exit(1);
  }

  // Read system prompt from file
  let systemPrompt: string;
  try {
    systemPrompt = await promptFileHandle.text();
  } catch (e) {
    console.error(`Error reading prompt file ${resolvedPromptFile}: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  if (systemPrompt.trim().length === 0) {
    console.error('Error: Prompt file is empty.');
    process.exit(1);
  }

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

  if (context.length === 0) {
    console.error('Error: Input file is empty.');
    process.exit(1);
  }

  if (context.length > MAX_INPUT_LENGTH) {
    console.error(`Error: Input file too large. Please limit input to ${MAX_INPUT_LENGTH.toLocaleString()} characters.`);
    process.exit(1);
  }

  try {
    console.log(`[Adviser] Starting analysis in ${mode} mode...`);

    // Execute via Agent SDK (prompt comes from file, not persona lookup)
    const analysisResult = await executeClaude(systemPrompt, context, timeout);

    // Handle Result Output
    const resultMsg = await handleOutput(analysisResult, mode, outputFile, outputDir);

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
