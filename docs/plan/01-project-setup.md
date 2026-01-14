# Plan Part 1: Project Setup

**Focus**: Environment initialization, Type definitions, and Directory structure.

### Task 1: Initialize Project

**Files:**
- Create: `package.json` (auto-generated)
- Create: `tsconfig.json` (auto-generated)
- Create: `.gitignore`
- Create: `.env.example`

**Step 1: Init Bun**
Run: `bun init -y`

**Step 2: Update .gitignore**
Edit `.gitignore` to include:
```
node_modules/
dist/
*.log
.env
```

**Step 3: Create .env.example**
Create `.env.example` with the required configuration defaults:
```ini
# Anthropic / Claude Code Configuration
ANTHROPIC_API_KEY=
ANTHROPIC_BASE_URL=https://api.synthetic.new/anthropic
ANTHROPIC_AUTH_TOKEN=syn_xxx

# Synthetic Model Overrides
ANTHROPIC_DEFAULT_HAIKU_MODEL=hf:meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8
ANTHROPIC_DEFAULT_SONNET_MODEL=hf:zai-org/GLM-4.7
ANTHROPIC_DEFAULT_OPUS_MODEL=hf:zai-org/GLM-4.7
```

### Task 2: Define Shared Types

**Files:**
- Create: `skills/adviser/types.ts`

**Step 1: Create Types File**
Create `skills/adviser/types.ts` with:
```typescript
/**
 * The persona determines the system prompt and analysis focus
 */
export type PersonaType = 'design-review' | 'plan-analysis' | 'code-verification';

/**
 * Output mode determines how the result is delivered
 */
export type OutputMode = 'workflow' | 'human';

/**
 * Configuration options for the advisor
 */
export interface AdvisorOptions {
  taskType: PersonaType;
  mode?: OutputMode;
  context?: string;
  timeout?: number;
}

/**
 * Result of an advisor execution
 */
export interface AdvisorResult {
  success: boolean;
  output?: string;
  outputFile?: string;
  error?: string;
}
```

**Step 2: Verify Compilation**
Run: `bun --check skills/adviser/types.ts`
Expected: No errors

**Step 3: Commit**
```bash
git add skills/adviser/types.ts .gitignore .env.example
git commit -m "feat: add project setup and env examples"
```
