import { query } from '@anthropic-ai/claude-agent-sdk';
import { AnalysisSchema, type AnalysisResult } from './schemas';
import type { PersonaType } from './types';

/**
 * Execute Claude using the Agent SDK for structured analysis
 */
export async function executeClaude(
  systemPrompt: string,
  context: string,
  taskType: PersonaType,
  timeoutMs: number = 60000
): Promise<AnalysisResult> {
  const schema = (AnalysisSchema as any).toJSONSchema();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  const queryPromise = (async (): Promise<AnalysisResult> => {
    // Context is required for analysis
    const fullPrompt = `<context>\n${context}\n</context>`;
    let lastError: Error | null = null;

    for await (const message of query({
      prompt: fullPrompt,
      system: systemPrompt,
      options: {
        outputFormat: {
          type: 'json_schema',
          schema
        }
      }
    }))
 {
      // 1. Handle Permission Requests (Bail early in headless mode)
      if (message.type === 'permission_request')
 {
        throw new Error(
          'Permission required but cannot be displayed in headless mode. ' +
          'Ensure the environment is authenticated and allowed tools are configured.'
        );
      }

      // 2. Handle Errors from the SDK
      if (message.type === 'error'
) {
        lastError = new Error(`Agent error: ${message.error || 'Unknown error'}`);
      }

      // 3. Handle Results
      if (message.type === 'result'
) {
        // Special case: Failed to produce structured output
        if (message.subtype === 'error_max_structured_output_retries')
 {
          throw new Error(
            `Could not generate valid structured output after multiple retries. ` +
            `The input context may be too complex for the current schema.`
          );
        }

        if (message.structured_output) {
          const parsed = AnalysisSchema.safeParse(message.structured_output);
          if (parsed.success
) {
            return {
              ...parsed.data,
              timestamp: new Date().ISOString(),
              persona: taskType
            };
          }
          throw new Error(`Schema validation failed: ${JSON.stringify(parsed.error)}`);
        }
      }
    }

    throw lastError || new Error('No result received from Claude');
  })();

  return await Promise.race([queryPromise, timeoutPromise]);
}
