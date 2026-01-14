# Plan Part 3: CLI Engine

**Focus**: Interfacing with Claude Code and handling Output.

### Task 5: Implement Claude Executor

**Files:**
- Create: `skills/adviser/executor.ts`

**Step 1: Write Executor**
Create `skills/adviser/executor.ts`:

```typescript
/**
 * Execute Claude Code CLI in headless mode
 */
export async function executeClaude(
  prompt: string, 
  timeoutMs: number
): Promise<string> {
  // Construct command with dangerously-skip-permissions for non-interactive execution
  const cmd = [
    'claude',
    '--print',
    '--dangerously-skip-permissions',
    '-p', prompt
  ];

  try {
    const proc = Bun.spawn(cmd, {
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: 'inherit', // Inherit stdin just in case
      env: {
        ...process.env,
        // Ensure API key is present (map AUTH_TOKEN if needed)
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || '',
        // Pass through synthetic configuration explicitly for clarity
        ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || '',
        ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN || '',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || '',
        ANTHROPIC_DEFAULT_SONNET_MODEL: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || '',
        ANTHROPIC_DEFAULT_OPUS_MODEL: process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || ''
      }
    });

    // Handle timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        proc.kill();
        reject(new Error(`Claude execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const executionPromise = proc.exited.then(async (code) => {
      if (code !== 0) {
        const stderr = await new Response(proc.stderr).text();
        throw new Error(`Claude exited with code ${code}: ${stderr}`);
      }
      return await new Response(proc.stdout).text();
    });

    return await Promise.race([executionPromise, timeoutPromise]);
  } catch (err) {
    throw new Error(`Failed to execute Claude: ${err}`);
  }
}
```

### Task 6: Implement Output OutputHandler

**Files:**
- Create: `skills/adviser/output.ts`

**Step 1: Write Output Logic**
Create `skills/adviser/output.ts`:

```typescript
import { mkdir, write } from 'bun';
import type { OutputMode, PersonaType } from './types';

export async function handleOutput(
  content: string,
  mode: OutputMode,
  type: PersonaType
): Promise<string> {
  if (mode === 'workflow') {
    return content;
  }

  // Human mode: Save to file
  const timestamp = Date.now();
  const filename = `review-${type}-${timestamp}.md`;
  const dir = 'docs/reviews';
  const path = `${dir}/${filename}`;

  // Ensure directory exists (recursive)
  // Bun.write handles file creation, but we need dir check if strictly Node, 
  // but in Bun ecosystem we can use node:fs or shell.
  // Using shell for simplicity in this script context if needed, 
  // but strictly TS implementation:
  const fs = await import('node:fs/promises');
  await fs.mkdir(dir, { recursive: true });
  
  await Bun.write(path, content);
  
  return `Review saved to: ${path}`;
}
```

**Step 2: Commit**
```bash
git add skills/adviser/executor.ts skills/adviser/output.ts
git commit -m "feat: add claude executor and output handler"
```
