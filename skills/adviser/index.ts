#!/usr/bin/env bun
import { getPersonaPrompt } from './motifs';
import { executeClaude } from './runtimes';
import { handleOutput } from './output';
import type { PersonaType, OutputMode } from './types';
import { which } from 'bun';
import { join } from 'node:path';

async function readContextFromPath(path: string): Promise<string> {
  if (path === '-') {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString();
  }
  // Read from file - handle both absolute and relative paths
  const filePath = path.startsWith('/') ? path : join(process.cwd(), path);
  return await Bun.file(filePath).text();
}

function parseArgs(args: string[]): { taskType: PersonaType; mode: OutputMode; context: string; timeout: number } {
  let taskType: PersonaType | null = null;
  let mode: OutputMode = 'human';
  let context = '';
  let timeout = 60000;

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

    // Context (last positional or --context / -c)
    if (arg === '--context' || arg === '-c' || !arg.startsWith('-')) {
      const ctxArg = arg.startsWith('-') ? args[i + 1] : arg;
      if (!ctxArg) continue;

      const finalCtxArg = arg.startsWith('-') ? (args[++i] as string) : arg;
      if (finalCtxArg.startsWith('@')) {
        // File path: @file or @- for stdin
        context = finalCtxArg;
      } else {
        context = finalCtxArg;
      }
    }
  }

  if (!taskType) {
    throw new Error('Missing required taskType argument');
  }

  return { taskType: taskType as PersonaType, mode, context, timeout };
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
    console.error('Usage: advise <taskType> [options]');
    console.error('');
    console.error('Arguments:  taskType     Required: design-review, plan-analysis, code-verification');
    console.error('');
    console.error('Options:  --mode, -m <mode>      Output mode: human (default), workflow (JSON), or aisp (AISP 5.1)');
    console.error('  --context, -c <text>   Text/document content to analyze');
    console.error('  --timeout, -t <ms>     Timeout in milliseconds (default: 60000)');
    console.error('  --help, -h             Show this help message');
    console.error('');
    console.error('Context Input:  --context <text>       Direct text input');
    console.error('  --context @file.txt    Read from file');
    console.error('  --context @-           Read from stdin');
    console.error('');
    console.error('Positional context (legacy):  advise <taskType> [mode] <context> [timeout]');
    process.exit(args.length > 0 ? 0 : 1);
  }

  let taskType: PersonaType;
  let mode: OutputMode;
  let context: string;
  let timeout: number;

  try {
    ({ taskType, mode, context, timeout } = parseArgs(args));
  } catch (e) {
    console.error(`Error: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  // Read context from file if using @ prefix
  if (context.startsWith('@')) {
    const filePath = context.slice(1);
    try {
      context = await readContextFromPath(filePath);
    } catch (e) {
      console.error(`Error reading context from ${filePath === '-' ? 'stdin' : filePath}: ${e instanceof Error ? e.message : e}`);
      process.exit(1);
    }
  }

  // Validation
  const validTaskTypes: PersonaType[] = ['design-review', 'plan-analysis', 'code-verification'];
  if (!validTaskTypes.includes(taskType as PersonaType)) {
    console.error(`Invalid task type: ${taskType}. Must be one of: ${validTaskTypes.join(', ')}`);
    process.exit(1);
  }

  if (context.length === 0) {
    console.error('Context is required for analysis.');
    process.exit(1);
  }

  if (context.length > 500000) {
    console.error('Error: Context too large. Please limit input to 500,000 characters.');
    process.exit(1);
  }

  try {
    console.log(`[Adviser] Starting ${taskType} in ${mode} mode...`);

    // Load system prompt (inject AISP spec if aisp mode)
    const systemPrompt = getPersonaPrompt(taskType as PersonaType, mode);

    // Execute via Agent SDK
    const analysisResult = await executeClaude(systemPrompt, context, taskType as PersonaType, timeout);

    // Handle Result Output
    const resultMsg = await handleOutput(analysisResult, mode, taskType as PersonaType);

    // Print final result
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
