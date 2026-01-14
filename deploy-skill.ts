#!/usr/bin/env bun
/**
 * Deploy the adviser skill to an Antigravity-compatible project.
 *
 * Usage:
 *   bun deploy-skill.ts [destination]
 *
 * Examples:
 *   bun deploy-skill.ts                    # Interactive prompt for destination
 *   bun deploy-skill.ts /path/to/project   # Deploy to specific project
 *   bun deploy-skill.ts .                  # Deploy to current directory
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message: string) {
  console.error(`${colors.red}Error: ${message}${colors.reset}`);
}

function success(message: string) {
  console.error(`${colors.green}${message}${colors.reset}`);
}

function info(message: string) {
  console.log(`${colors.blue}${message}${colors.reset}`);
}

function warn(message: string) {
  console.warn(`${colors.yellow}${message}${colors.reset}`);
}

// Copy a file or directory recursively
function copySync(src: string, dest: string) {
  const stat = statSync(src);

  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src)) {
      copySync(join(src, entry), join(dest, entry));
    }
  } else {
    mkdirSync(dest.split('/').slice(0, -1).join('/'), { recursive: true });
    writeFileSync(dest, readFileSync(src));
  }
}

// Get all TypeScript files from a directory (excluding tests)
function getTsFiles(dir: string): string[] {
  const files: string[] = [];
  const stat = statSync(dir);

  if (stat.isDirectory()) {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        files.push(...getTsFiles(fullPath));
      } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

// Copy motif text files
function copyMotifFiles(sourceDir: string, destDir: string) {
  const motifsDir = join(sourceDir, 'motifs');
  if (existsSync(motifsDir) && statSync(motifsDir).isDirectory()) {
    mkdirSync(join(destDir, 'motifs'), { recursive: true });
    for (const entry of readdirSync(motifsDir)) {
      const fullPath = join(motifsDir, entry);
      if (entry.endsWith('.txt')) {
        copySync(fullPath, join(destDir, 'motifs', entry));
      }
    }
  }
}

// Main deployment function
async function deploy(destination: string) {
  const resolvedDest = resolve(destination);
  const skillName = 'adviser';
  const skillDestDir = join(resolvedDest, '.agent', 'skills', skillName);

  // Source paths
  const sourceSkillDir = join(process.cwd(), 'skills', skillName);
  const sourceSkillMd = join(sourceSkillDir, 'SKILL.md');
  const sourceIndex = join(sourceSkillDir, 'index.ts');

  log('=== Antigravity Skill Deployer ===', 'bright');
  log(`Deploying "${skillName}" skill to: ${resolvedDest}\n`, 'blue');

  // Validate source
  if (!existsSync(sourceSkillDir)) {
    error(`Source skill directory not found: ${sourceSkillDir}`);
    process.exit(1);
  }

  if (!existsSync(sourceSkillMd)) {
    error(`SKILL.md not found: ${sourceSkillMd}`);
    process.exit(1);
  }

  if (!existsSync(sourceIndex)) {
    error(`index.ts not found: ${sourceIndex}`);
    process.exit(1);
  }

  // Check if destination exists and is a directory
  if (!existsSync(resolvedDest)) {
    warn(`Destination directory does not exist: ${resolvedDest}`);
    warn('Please provide the path to an existing project.');
    process.exit(1);
  }

  if (!statSync(resolvedDest).isDirectory()) {
    error(`Destination is not a directory: ${resolvedDest}`);
    process.exit(1);
  }

  // Check if skill already exists at destination
  if (existsSync(skillDestDir)) {
    warn(`Skill directory already exists: ${skillDestDir}`);
    const overwrite = await confirmOverwrite();
    if (!overwrite) {
      log('Deployment cancelled.', 'yellow');
      process.exit(0);
    }
  }

  // Create skill directory structure
  log('Creating skill directory structure...', 'blue');
  mkdirSync(skillDestDir, { recursive: true });

  // Copy SKILL.md
  log(`Copying SKILL.md...`, 'blue');
  copySync(sourceSkillMd, join(skillDestDir, 'SKILL.md'));

  // Create scripts directory
  const scriptsDir = join(skillDestDir, 'scripts');
  mkdirSync(scriptsDir, { recursive: true });

  // Copy all .ts files to scripts directory (excluding tests)
  log(`Copying script files...`, 'blue');
  const tsFiles = getTsFiles(sourceSkillDir);
  for (const file of tsFiles) {
    const relativePath = relative(sourceSkillDir, file);
    const destPath = join(scriptsDir, relativePath);
    copySync(file, destPath);
  }

  // Copy motif text files
  log(`Copying motif files...`, 'blue');
  copyMotifFiles(sourceSkillDir, scriptsDir);

  // index.ts is the main entry point with full CLI functionality
  // No need to generate a separate advise.ts - index.ts handles everything

  // Create examples directory with a simple example
  const examplesDir = join(skillDestDir, 'examples');
  mkdirSync(examplesDir, { recursive: true });

  const exampleContent = `# Adviser Skill Usage Examples

## Quick Start

\`\`\`bash
# Design review with direct text
bun run .agent/skills/adviser/scripts/index.ts design-review -c "Your design document text..."

# Plan analysis with file input
bun run .agent/skills/adviser/scripts/index.ts plan-analysis -c @implementation-plan.md

# Code verification with workflow output
bun run .agent/skills/adviser/scripts/index.ts code-verification -m workflow -c @src/auth.ts
\`\`\`

## Full CLI Options

\`\`\`bash
bun run .agent/skills/adviser/scripts/index.ts <taskType> [options]

Arguments:
  taskType     Required: design-review, plan-analysis, code-verification

Options:
  --mode, -m      Output mode: human (default) or workflow
  --context, -c   Text/document content to analyze (required)
  --timeout, -t   Timeout in milliseconds (default: 60000)
  --help, -h      Show help
\`\`\`

## Context Input Methods

\`\`\`bash
# Direct text
bun run .agent/skills/adviser/scripts/index.ts design-review -c "API design document..."

# From file
bun run .agent/skills/adviser/scripts/index.ts design-review -c @design-doc.txt

# From stdin
cat design.md | bun run .agent/skills/adviser/scripts/index.ts design-review -c @-
\`\`\`

## Output Modes

\`\`\`bash
# Human mode (default) - saves markdown to docs/reviews/
bun run .agent/skills/adviser/scripts/index.ts design-review -c @design.md

# Workflow mode - JSON to stdout for pipeline integration
bun run .agent/skills/adviser/scripts/index.ts design-review -m workflow -c @design.md > result.json
\`\`\`
`;

  writeFileSync(join(examplesDir, 'usage.md'), exampleContent);

  // Summary
  log('\n=== Deployment Complete ===', 'bright');
  log(`Skill deployed to: ${skillDestDir}`, 'green');
  log('\nDirectory structure:', 'blue');
  log(`  .agent/skills/${skillName}/`, 'blue');
  log(`  ├── SKILL.md`, 'blue');
  log(`  ├── scripts/`, 'blue');
  log(`  │   ├── index.ts      (main CLI entry point)`, 'blue');
  log(`  │   ├── runtimes.ts   (Claude SDK execution)`, 'blue');
  log(`  │   ├── output.ts     (output handling)`, 'blue');
  log(`  │   ├── schemas.ts    (Zod validation)`, 'blue');
  log(`  │   ├── types.ts      (type definitions)`, 'blue');
  log(`  │   ├── motifs.ts     (persona prompts)`, 'blue');
  log(`  │   └── motifs/       (prompt text files)`, 'blue');
  log(`  └── examples/`, 'blue');
  log(`      └── usage.md`, 'blue');

  log('\nTo use the skill in your project:', 'bright');
  log(`  bun run ${join('.agent/skills', skillName, 'scripts', 'index.ts')} <taskType> -c <context>`, 'green');
  log('\nExamples:', 'blue');
  log(`  bun run ${join('.agent/skills', skillName, 'scripts', 'index.ts')} design-review -c @design-doc.md`, 'blue');
  log(`  bun run ${join('.agent/skills', skillName, 'scripts', 'index.ts')} plan-analysis -m workflow -c "Plan text..."`, 'blue');
  log('\nSee examples/usage.md for more usage information.\n', 'blue');
}

// Interactive confirmation for overwrite
async function confirmOverwrite(): Promise<boolean> {
  const readline = await import('node:readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Overwrite existing skill? [y/N] ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Parse command line arguments
function parseArgs(): string | null {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Interactive mode
    return null;
  }

  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    printUsage();
    process.exit(0);
  }

  return args[0] || null;
}

function printUsage() {
  console.log(`
Usage: bun deploy-skill.ts [destination]

Deploy the adviser skill to an Antigravity-compatible project.

Arguments:
  destination    Path to the project directory (default: prompt for input)

Options:
  -h, --help     Show this help message

Examples:
  bun deploy-skill.ts                    # Interactive prompt for destination
  bun deploy-skill.ts /path/to/project   # Deploy to specific project
  bun deploy-skill.ts .                  # Deploy to current directory

The skill will be deployed to:
  <destination>/.agent/skills/adviser/

For more information, see:
  https://antigravity.google/docs/skills
  https://agentskills.io/home
`);
}

// Interactive mode for destination selection
async function interactiveDestination(): Promise<string> {
  const readline = await import('node:readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('');

  return new Promise((resolve) => {
    rl.question('Enter path to project directory: ', (answer) => {
      rl.close();
      if (!answer.trim()) {
        error('No destination provided.');
        process.exit(1);
      }
      resolve(answer.trim());
    });
  });
}

// Main entry point
async function main() {
  const arg = parseArgs();

  if (arg === null) {
    const destination = await interactiveDestination();
    await deploy(destination);
  } else {
    await deploy(arg);
  }
}

// Run
if (import.meta.main) {
  main().catch((err) => {
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
