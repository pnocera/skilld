# Plan Part 3: CLI Engine

**Focus**: Interfacing with Claude Code and handling Output.

### Task 5: Implement Claude Executor

**Files:**
- Create: `skills/adviser/executor.ts`

**Step 1: Write Executor**
Create `skills/adviser/executor.ts` using the Claude Agent SDK:

```typescript
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
    })) {
      // 1. Handle Permission Requests (Bail early in headless mode)
      if (message.type === 'permission_request') {
        throw new Error(
          'Permission required but cannot be displayed in headless mode. ' +
          'Ensure the environment is authenticated and allowed tools are configured.'
        );
      }

      // 2. Handle Errors from the SDK
      if (message.type === 'error') {
        lastError = new Error(`Agent error: ${message.error || 'Unknown error'}`);
      }

      // 3. Handle Results
      if (message.type === 'result') {
        // Special case: Failed to produce structured output
        if (message.subtype === 'error_max_structured_output_retries') {
          throw new Error(
            `Could not generate valid structured output after multiple retries. ` +
            `The input context may be too complex for the current schema.`
          );
        }

        if (message.structured_output) {
          const parsed = AnalysisSchema.safeParse(message.structured_output);
          if (parsed.success) {
            return {
              ...parsed.data,
              timestamp: new Date().toISOString(),
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
```

### Task 6: Implement Output Handler

**Files:**
- Create: `skills/adviser/output.ts`

**Step 1: Write Output Logic**
Create `skills/adviser/output.ts` to handle both structured JSON and markdown conversion:

```typescript
import { write } from 'bun';
import type { OutputMode, PersonaType } from './types';
import type { AnalysisResult } from './schemas';
import { join } from 'node:path';

export async function handleOutput(
  result: AnalysisResult,
  mode: OutputMode,
  type: PersonaType
): Promise<string> {
  if (mode === 'workflow') {
    return JSON.stringify(result, null, 2);
  }

  // Human mode: Convert to markdown and save
  const filename = `review-${type}-${Date.now()}.md`;
  const baseDir = process.env.ADVISOR_OUTPUT_DIR || 'docs/reviews';
  const path = join(process.cwd(), baseDir, filename);

  // Build Markdown content
  let markdown = `# ${type.replace(/-/g, ' ').toUpperCase()} Review\n\n`;
  markdown += `**Date:** ${new Date(result.timestamp).toISOString()}\n\n`;
  markdown += `## Summary\n\n${result.summary}\n\n`;
  
  if (result.issues.length > 0) {
    markdown += `## Issues (${result.issues.length})\n\n`;
    for (const issue of result.issues) {
      const emoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[issue.severity];
      markdown += `### ${emoji} ${issue.severity.toUpperCase()}\n`;
      markdown += `${issue.description}\n`;
      if (issue.location) markdown += `**Location:** ${issue.location}\n`;
      if (issue.recommendation) markdown += `**Recommendation:** ${issue.recommendation}\n`;
      markdown += '\n';
    }
  }
  
  if (result.suggestions.length > 0) {
    markdown += '## Suggestions\n\n';
    for (const suggestion of result.suggestions) {
      markdown += `- ${suggestion}\n`;
    }
  }

  const fs = await import('node:fs/promises');
  await fs.mkdir(join(process.cwd(), baseDir), { recursive: true });
  
  await Bun.write(path, markdown);
  
  return `Review saved to: ${path}`;
}
```

**Step 2: Commit**
```bash
git add skills/adviser/executor.ts skills/adviser/output.ts
git commit -m "feat: add claude executor and output handler"
```
