import { query } from '@anthropic-ai/claude-agent-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AnalysisSchema, type AnalysisResult } from './schemas';
import type { PersonaType } from './types';
import { which } from 'bun';
import { platform } from 'node:os';

/**
 * Find the claude executable path
 */
function findClaudePath(): string {
  const isWin = platform() === 'win32';
  const found = which('claude');
  if (found) return found;
  // Fallback paths
  return isWin ? 'claude.cmd' : 'claude';
}

/**
 * Execute Claude using the Agent SDK for structured analysis
 * @throws {Error} If timeout occurs, permission required, or validation fails
 */
export async function executeClaude(
  systemPrompt: string,
  context: string,
  taskType: PersonaType,
  timeoutMs: number = 60000
): Promise<AnalysisResult> {
  // Convert Zod schema to JSON Schema using the recommended library
  const schema = zodToJsonSchema(AnalysisSchema);

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const fullPrompt = `<context>\n${context}\n</context>`;

    // Get claude path using static imports (works in compiled binaries)
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
        // Non-interactive mode: bypass permissions
        allowDangerouslySkipPermissions: true,
        permissionMode: 'bypassPermissions',
        // Ensure we have access to work directory
        cwd: process.cwd(),
        // Load project settings to get authentication
        settingSources: ['user', 'project']
      }
    })) {
      // Handle result messages
      if (message.type === 'result') {
        // Success: check for structured_output
        if (message.subtype === 'success') {
          if ('structured_output' in message && message.structured_output !== undefined) {
            const parsed = AnalysisSchema.safeParse(message.structured_output as unknown);
            if (parsed.success) {
              return {
                ...parsed.data,
                timestamp: new Date().toISOString(),
                persona: taskType
              };
            }
            throw new Error(`Schema validation failed: ${JSON.stringify(parsed.error)}`);
          }
          // No structured output - this shouldn't happen with outputFormat set
          throw new Error('Expected structured_output but it was not present');
        }

        // Handle error subtypes
        if (message.subtype === 'error_max_structured_output_retries') {
          throw new Error(
            `Could not generate valid structured output after multiple retries. ` +
            `The input context may be too complex for the current schema.`
          );
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

    // If we get here, no proper result was received
    throw new Error('No result received from Claude');
  } finally {
    clearTimeout(timeoutId);
  }
}
