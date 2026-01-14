# Plan Part 1: Project Setup

**Focus**: Environment initialization, Type definitions, and Directory structure.

### Prerequisites

- **Bun**: Runtime and package manager.
- **Claude Code CLI**: The Agent SDK uses Claude Code as its runtime. [Install instructions](https://code.claude.com/docs/en/setup).
- **Anthropic Account**: Activated and authenticated via `claude login`.

### Task 1: Initialize Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`

**Step 1: Init Bun & Install Dependencies**
Run:
```bash
bun init -y
bun add @anthropic-ai/claude-agent-sdk zod@latest
```

NOTE: `zod` v4+ provides native JSON schema support via `.toJSONSchema()`, so `zod-to-json-schema` is no longer required.

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
# Anthropic API Configuration
ANTHROPIC_API_KEY=
```

### Task 1.2: Define Antigravity Skill

**Files:**
- Create: `skills/adviser/.claude-skill.json`

**Step 1: Create Skill Descriptor**
Create `skills/adviser/.claude-skill.json` to register the skill with Antigravity:
```json
{
  "name": "adviser",
  "description": "Critical analysis and quality assurance advisor using Claude Agent SDK",
  "version": "1.0.0",
  "entry": "./index.ts",
  "parameters": {
    "taskType": {
      "type": "enum",
      "values": ["design-review", "plan-analysis", "code-verification"],
      "required": true,
      "description": "The type of analysis to perform"
    },
    "mode": {
      "type": "enum",
      "values": ["workflow", "human"],
      "default": "human",
      "description": "Output mode: 'human' (markdown files) or 'workflow' (JSON)"
    },
    "context": {
      "type": "string",
      "default": "",
      "description": "The text or document content to analyze"
    },
    "timeout": {
      "type": "number",
      "default": 60000,
      "description": "Execution timeout in milliseconds"
    }
  }
}
```

### Task 1.3: Setup Testing Infrastructure

**Files:**
- Modify: `package.json`

**Step 1: Add Test Scripts**
Update `package.json`:
```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch"
  }
}
```

### Task 1.4: Define Analysis Schema

**Files:**
- Create: `skills/adviser/schemas.ts`

**Step 1: Create Schema File**
Create `skills/adviser/schemas.ts` for structured analysis results:
```typescript
import { z } from 'zod';

export const AnalysisSchema = z.object({
  summary: z.string(),
  issues: z.array(z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    location: z.string().optional(),
    recommendation: z.string().optional()
  })),
  suggestions: z.array(z.string())
});

export type AnalysisResult = z.infer<typeof AnalysisSchema> & {
  timestamp: string;
  persona: PersonaType;
};
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
git add skills/adviser/types.ts .gitignore .env.example skills/adviser/.claude-skill.json
git commit -m "feat: add project setup, skill definition, and testing infra"
```
