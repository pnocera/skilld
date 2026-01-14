#!/usr/bin/env bun
import { getPersonaPrompt } from './motifs';
import { executeClaude } from './runtimes';
import { handleOutput } from './output';
import type { PersonaType, OutputMode } from './types';
import { which } from 'bun';

async function main() {
  const args = process.argv.slice(2);

  // 0. Runtime check
  const claudePath = await which('claude');
  if (!claudePath) {
    console.error('[Adviser] Error: Claude Code CLI (claude) not found. This is required by the Agent SDK.');
    console.error('Please install it: curl -fsSL https://claude.ai/install.sh | bash');
    process.exit(1);
  }

  if (args.length < 1) {
    console.error('Usage: advise <taskType> [mode] [context] [timeout]');
    console.error('');
    console.error('Parameters:');
    console.error('  taskType Required: design-review, plan-analysis, code-verification');
    console.error('  mode      Optional: human (default) or workflow (JSON output)');
    console.error('  context   Required: Text/document content to analyze');
    console.error('  timeout   Optional: Timeout in ms (default: 60000)');
    process.exit(1);
  }

  const taskType = args[0] as PersonaType;
  const mode = (args[1] as OutputMode) || 'human';
  const context = args[2] || '';
  const timeout = parseInt(args[3] || '60000', 10);

  // 1. Validation
  const validTaskTypes = ['design-review', 'plan-analysis', 'code-verification'];
  if (!validTaskTypes.includes(taskType)) {
    console.error(`Invalid task type: ${taskType}. Must be one of: ${validTaskTypes.join(', ')}`);
    process.exit(1);
  }

  if (context.length === 0) {
    console.error('Error: Context is required for analysis.');
    console.error('Provide the text/document content you want to analyze as the third argument.');
    process.exit(1);
  }

  if (context.length > 50000) {
    console.error('Error: Context too large. Please limit input to 50,000 characters.');
    process.exit(1);
  }

  try {
    console.log(`[Adviser] Starting ${taskType} in ${mode} mode...`);

    // 2. Load system prompt
    const systemPrompt = getPersonaPrompt(taskType);

    // 3. Execute via Agent SDK
    const analysisResult = await executeClaude(systemPrompt, context, taskType, timeout);

    // 4. Handle Result Output
    const resultMsg = await handleOutput(analysisResult, mode, taskType);

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
