#!/usr/bin/env bun
/**
 * Deploy the adviser skill to an Antigravity-compatible project.
 *
 * Deploys self-contained executables - no Bun runtime required on target.
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
import { join, resolve, dirname } from 'node:path';

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
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(src));
  }
}

// Copy workflow markdown files
function copyWorkflows(sourceWorkflowsDir: string, destWorkflowsDir: string): string[] {
  const copiedFiles: string[] = [];

  if (!existsSync(sourceWorkflowsDir) || !statSync(sourceWorkflowsDir).isDirectory()) {
    return copiedFiles;
  }

  mkdirSync(destWorkflowsDir, { recursive: true });

  for (const entry of readdirSync(sourceWorkflowsDir)) {
    const fullPath = join(sourceWorkflowsDir, entry);
    if (entry.endsWith('.md') && statSync(fullPath).isFile()) {
      copySync(fullPath, join(destWorkflowsDir, entry));
      copiedFiles.push(entry);
    }
  }

  return copiedFiles;
}

// Detect target platform
function detectPlatform(): 'windows' | 'linux' {
  return process.platform === 'win32' ? 'windows' : 'linux';
}

// Main deployment function
async function deploy(destination: string) {
  const resolvedDest = resolve(destination);
  const skillName = 'adviser';
  const skillDestDir = join(resolvedDest, '.agent', 'skills', skillName);

  // Source paths
  const sourceSkillDir = join(process.cwd(), 'skills', skillName);
  const sourceSkillMd = join(sourceSkillDir, 'SKILL.md');
  const sourceDistDir = join(sourceSkillDir, 'dist');
  const sourceWindowsExe = join(sourceDistDir, 'adviser.exe');
  const sourceLinuxExe = join(sourceDistDir, 'adviser');

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

  // Check for compiled executables
  const hasWindowsExe = existsSync(sourceWindowsExe);
  const hasLinuxExe = existsSync(sourceLinuxExe);

  if (!hasWindowsExe && !hasLinuxExe) {
    error('No compiled executables found in dist/');
    error('Run the build script first: ./skills/adviser/build.ps1');
    process.exit(1);
  }

  log('Available executables:', 'blue');
  if (hasWindowsExe) {
    const size = (statSync(sourceWindowsExe).size / 1024 / 1024).toFixed(2);
    log(`  ✓ adviser.exe (${size} MB)`, 'green');
  }
  if (hasLinuxExe) {
    const size = (statSync(sourceLinuxExe).size / 1024 / 1024).toFixed(2);
    log(`  ✓ adviser (${size} MB)`, 'green');
  }
  log('', 'reset');

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

  // Copy executables
  log(`Copying executables...`, 'blue');
  if (hasWindowsExe) {
    copySync(sourceWindowsExe, join(skillDestDir, 'adviser.exe'));
    log(`  → adviser.exe`, 'green');
  }
  if (hasLinuxExe) {
    copySync(sourceLinuxExe, join(skillDestDir, 'adviser'));
    log(`  → adviser`, 'green');
  }

  // Create examples directory with updated examples
  const examplesDir = join(skillDestDir, 'examples');
  mkdirSync(examplesDir, { recursive: true });

  const platform = detectPlatform();
  const adviserCmd = platform === 'windows' ? 'adviser.exe' : './adviser';

  const exampleContent = `# Adviser Skill Usage Examples

## Quick Start

\`\`\`bash
# Design review with direct text
${adviserCmd} design-review -c "Your design document text..."

# Plan analysis with file input
${adviserCmd} plan-analysis -c @implementation-plan.md

# Code verification with workflow output
${adviserCmd} code-verification -m workflow -c @src/auth.ts
\`\`\`

## Full CLI Options

\`\`\`bash
${adviserCmd} <taskType> [options]

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
${adviserCmd} design-review -c "API design document..."

# From file
${adviserCmd} design-review -c @design-doc.txt

# From stdin
cat design.md | ${adviserCmd} design-review -c @-
\`\`\`

## Output Modes

\`\`\`bash
# Human mode (default) - saves markdown to docs/reviews/
${adviserCmd} design-review -c @design.md

# Workflow mode - JSON to stdout for pipeline integration
${adviserCmd} design-review -m workflow -c @design.md > result.json
\`\`\`

## Prerequisites

The adviser executable is self-contained—no Bun runtime required!

You just need Claude CLI authenticated:
\`\`\`bash
# Install
curl -fsSL https://claude.ai/install.sh | bash

# Authenticate
claude login

# Accept non-interactive mode (required once)
claude --dangerously-skip-permissions
\`\`\`

No separate \`ANTHROPIC_API_KEY\` needed—uses Claude CLI's stored credentials!
`;

  writeFileSync(join(examplesDir, 'usage.md'), exampleContent);

  // Copy workflows
  const sourceWorkflowsDir = join(process.cwd(), 'workflows');
  const destWorkflowsDir = join(resolvedDest, '.agent', 'workflows');
  log(`Copying workflow files...`, 'blue');
  const copiedWorkflows = copyWorkflows(sourceWorkflowsDir, destWorkflowsDir);

  // Summary
  log('\n=== Deployment Complete ===', 'bright');
  log(`Skill deployed to: ${skillDestDir}`, 'green');
  if (copiedWorkflows.length > 0) {
    log(`Workflows deployed to: ${destWorkflowsDir}`, 'green');
  }
  log('\nDirectory structure:', 'blue');
  log(`  .agent/skills/${skillName}/`, 'blue');
  log(`  ├── SKILL.md`, 'blue');
  if (hasWindowsExe) {
    log(`  ├── adviser.exe     (Windows executable)`, 'blue');
  }
  if (hasLinuxExe) {
    log(`  ├── adviser         (Linux executable)`, 'blue');
  }
  log(`  └── examples/`, 'blue');
  log(`      └── usage.md`, 'blue');
  if (copiedWorkflows.length > 0) {
    log(`  .agent/workflows/`, 'blue');
    for (const wf of copiedWorkflows) {
      log(`  ├── ${wf}`, 'blue');
    }
  }

  log('\n✨ No Bun runtime required on target machine!', 'bright');
  log('\nTo use the skill in your project:', 'bright');

  if (hasWindowsExe) {
    log(`  Windows: .agent\\skills\\${skillName}\\adviser.exe <taskType> -c <context>`, 'green');
  }
  if (hasLinuxExe) {
    log(`  Linux:   .agent/skills/${skillName}/adviser <taskType> -c <context>`, 'green');
  }

  log('\nExamples:', 'blue');
  log(`  adviser design-review -c @design-doc.md`, 'blue');
  log(`  adviser plan-analysis -m workflow -c "Plan text..."`, 'blue');
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

This deploys self-contained executables - no Bun runtime required on target!

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

Deployed files:
  - adviser.exe   (Windows x64 executable)
  - adviser       (Linux x64 executable)
  - SKILL.md      (Documentation)
  - examples/     (Usage examples)

Prerequisites on target machine:
  - Claude Code CLI (authenticated via 'claude login')
  - Must have run 'claude --dangerously-skip-permissions' once

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
