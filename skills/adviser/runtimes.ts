import { query } from '@anthropic-ai/claude-agent-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AnalysisSchema, type AnalysisResult } from './schemas';
import { which } from 'bun';
import { platform } from 'node:os';

/**
 * Find the claude executable path
 */
function findClaudePath(): string {
  const isWin = platform() === 'win32';
  const found = which('claude');
  if (found) return found;
  return isWin ? 'claude.cmd' : 'claude';
}

/**
 * Execute Claude using the Agent SDK for structured analysis
 * @param systemPrompt - The complete system prompt (loaded from prompt file)
 * @param context - The content to analyze (loaded from input file)
 * @param timeoutMs - Timeout in milliseconds
 * @throws {Error} If timeout occurs, permission required, or validation fails
 */
export async function executeClaude(
  systemPrompt: string,
  context: string,
  timeoutMs: number = 60000
): Promise<AnalysisResult> {
  const schema = zodToJsonSchema(AnalysisSchema);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const fullPrompt = `<context>\n${context}\n</context>`;
    const claudePath = findClaudePath();

    for await (const message of query({
      prompt: fullPrompt,
      options: {
        systemPrompt,
        pathToClaudeCodeExecutable: claudePath,
        outputFormat: {
          type: 'json_schema',
          schema: schema
        },
        abortController: controller,
        maxTurns: 10,
        allowDangerouslySkipPermissions: true,
        permissionMode: 'bypassPermissions',
        cwd: process.cwd(),
        settingSources: ['user', 'project']
      }
    })) {
      if (message.type === 'result') {
        if (message.subtype === 'success') {
          if ('structured_output' in message && message.structured_output !== undefined) {
            const parsed = AnalysisSchema.safeParse(message.structured_output as unknown);
            if (parsed.success) {
              return {
                ...parsed.data,
                timestamp: new Date().toISOString()
              };
            }
            throw new Error(`Schema validation failed: ${JSON.stringify(parsed.error)}`);
          }
          throw new Error('Expected structured_output but it was not present');
        }

        if (message.subtype === 'error_max_structured_output_retries') {
          throw new Error('Could not generate valid structured output after multiple retries.');
        }
        if (message.subtype === 'error_max_turns') {
          throw new Error('Exceeded maximum number of turns before completion');
        }
        if (message.subtype === 'error_max_budget_usd') {
          throw new Error('Exceeded maximum budget');
        }
        if (message.subtype === 'error_during_execution') {
          const msg = message as any;
          const errors = msg.errors || [];
          throw new Error(`Execution error: ${errors.join(', ')}`);
        }
      }
    }

    throw new Error('No result received from Claude');
  } finally {
    clearTimeout(timeoutId);
  }
}
