# Plan Part 4: CLI Interface

**Focus**: Main entry point and argument parsing.

### Task 7: Implement Main Entry Point

**Files:**
- Create: `skills/adviser/index.ts`

**Step 1: Write Main Logic**
Create `skills/adviser/index.ts`:

```typescript
import { getPersonaPrompt } from './prompts';
import { executeClaude } from './executor';
import { handleOutput } from './output';
import type { PersonaType, OutputMode } from './types';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: advisor <taskType> [mode] [context] [timeout]');
    process.exit(1);
  }

  const taskType = args[0] as PersonaType;
  const mode = (args[1] as OutputMode) || 'human';
  const context = args[2] || '';
  const timeout = parseInt(args[3] || '30000', 10);

  // Validate Task Type
  if (!['design-review', 'plan-analysis', 'code-verification'].includes(taskType)) {
    console.error(`Invalid task type: ${taskType}`);
    process.exit(1);
  }

  try {
    // 1. Prepare Prompt
    const systemPrompt = getPersonaPrompt(taskType);
    const finalPrompt = context 
      ? `${systemPrompt}\n\nCONTEXT:\n${context}`
      : systemPrompt;

    // 2. Execute
    const output = await executeClaude(finalPrompt, timeout);

    // 3. Handle Result
    const resultMsg = await handleOutput(output, mode, taskType);
    
    // Print final result (either the content or the file path message)
    console.log(resultMsg);

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

// Run if main
if (import.meta.main) {
  main();
}
```

**Step 2: Integration Test Script**
Create `skills/adviser/test-run.ts` to verify E2E without compiling:
```typescript
import { spawn } from 'bun';

const proc = Bun.spawn(['bun', 'run', 'skills/adviser/index.ts', 'design-review', 'workflow', 'test context'], {
  stdout: 'inherit',
  stderr: 'inherit'
});

await proc.exited;
```

**Step 3: Commit**
```bash
git add skills/adviser/index.ts
git commit -m "feat: add main cli entry point"
```
