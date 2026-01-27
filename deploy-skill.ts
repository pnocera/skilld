#!/usr/bin/env bun
/**
 * Deploy the adviser skill to a Claude Code project.
 *
 * Deploys self-contained executables - no Bun runtime required on target.
 *
 * Usage:
 *   bun deploy-skill.ts [destination] [--claude]
 *
 * Examples:
 *   bun deploy-skill.ts                    # Interactive prompt for destination
 *   bun deploy-skill.ts /path/to/project   # Deploy to specific project (.agent)
 *   bun deploy-skill.ts . --claude         # Deploy to .claude in current dir
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, chmodSync } from 'node:fs';
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
function copyWorkflows(sourceWorkflowsDir: string, destWorkflowsDir: string, agentDirName: string): string[] {
  const copiedFiles: string[] = [];

  if (!existsSync(sourceWorkflowsDir) || !statSync(sourceWorkflowsDir).isDirectory()) {
    return copiedFiles;
  }

  mkdirSync(destWorkflowsDir, { recursive: true });

  const isClaude = agentDirName === '.claude';

  for (const entry of readdirSync(sourceWorkflowsDir)) {
    const fullSourcePath = join(sourceWorkflowsDir, entry);
    if (entry.endsWith('.md') && statSync(fullSourcePath).isFile()) {
      let destFilename = entry;
      let content = readFileSync(fullSourcePath, 'utf8');

      // Replace {{AGENT_DIR}} placeholder with actual agent directory
      content = content.replace(/\{\{AGENT_DIR\}\}/g, agentDirName);

      if (isClaude) {
        // Clean up frontmatter for Claude slash commands
        // 1. Remove 'name:' field as it's for skills, not commands
        content = content.replace(/^name:.*\n/gm, '');
        // 2. Remove Antigravity-specific comments
        content = content.replace(/^\/\/ turbo.*\n/gm, '');
      }

      writeFileSync(join(destWorkflowsDir, destFilename), content);
      copiedFiles.push(destFilename);
    }
  }

  return copiedFiles;
}

// Copy protocol .aisp files
function copyProtocols(sourceProtocolsDir: string, destProtocolsDir: string): string[] {
  const copiedFiles: string[] = [];

  if (!existsSync(sourceProtocolsDir) || !statSync(sourceProtocolsDir).isDirectory()) {
    return copiedFiles;
  }

  mkdirSync(destProtocolsDir, { recursive: true });

  for (const entry of readdirSync(sourceProtocolsDir)) {
    const fullSourcePath = join(sourceProtocolsDir, entry);
    if (entry.endsWith('.aisp') && statSync(fullSourcePath).isFile()) {
      writeFileSync(join(destProtocolsDir, entry), readFileSync(fullSourcePath));
      copiedFiles.push(entry);
    }
  }

  return copiedFiles;
}

// Main deployment function
async function deploy(destination: string, targetDir: string = '.agent') {
  const resolvedDest = resolve(destination);
  const skillName = 'adviser';

  // Check if destination exists and is a directory
  if (!existsSync(resolvedDest)) {
    error(`Destination directory does not exist: ${resolvedDest}`);
    process.exit(1);
  }

  if (!statSync(resolvedDest).isDirectory()) {
    error(`Destination is not a directory: ${resolvedDest}`);
    process.exit(1);
  }

  const agentDirName = targetDir;
  info(`Targeting ${agentDirName === '.claude' ? 'Claude Code' : 'Antigravity'} directory: ${agentDirName}`);

  const skillDestDir = join(resolvedDest, agentDirName, 'skills', skillName);
  const skillScriptsDir = join(skillDestDir, 'scripts');
  const workflowDirName = agentDirName === '.claude' ? 'commands' : 'workflows';
  const destWorkflowsDir = join(resolvedDest, agentDirName, workflowDirName);

  // Source paths
  const sourceSkillDir = join(process.cwd(), 'skills', skillName);
  const sourceSkillMd = join(sourceSkillDir, 'SKILL.md');
  const sourceDistDir = join(sourceSkillDir, 'dist');
  const sourceWindowsExe = join(sourceDistDir, 'adviser.exe');
  const sourceLinuxExe = join(sourceDistDir, 'adviser');
  const sourceAispSpec = join(sourceSkillDir, 'motifs', 'aisp-spec.md');
  const sourceAispQuickRef = join(sourceSkillDir, 'motifs', 'aisp-quick-ref.md');

  log(`=== ${agentDirName === '.claude' ? 'Claude' : 'Antigravity'} Skill Deployer ===`, 'bright');
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
  mkdirSync(skillScriptsDir, { recursive: true });

  // Copy and process SKILL.md
  log(`Copying SKILL.md with path adaptation...`, 'blue');
  const skillMdContent = readFileSync(sourceSkillMd, 'utf8');
  const winPath = `${agentDirName === '.agent' ? '.agent' : '.claude'}\\skills\\${skillName}\\scripts\\adviser.exe`;
  const linuxPath = `${agentDirName}/skills/${skillName}/scripts/adviser`;

  const processedMd = skillMdContent
    .replace(/{{ADVISER_EXE}}/g, winPath)
    .replace(/{{ADVISER_BIN}}/g, linuxPath)
    .replace(/{{AGENT_DIR}}/g, agentDirName);

  writeFileSync(join(skillDestDir, 'SKILL.md'), processedMd);

  // Copy AISP 5.1 specification (full spec for reviewer AI)
  if (existsSync(sourceAispSpec)) {
    log(`Copying AISP 5.1 Specification...`, 'blue');
    copySync(sourceAispSpec, join(skillDestDir, 'aisp-spec.md'));
    log(`  → aisp-spec.md (full spec for Reviewer AI)`, 'green');
  }

  // Copy AISP Quick Reference (minimal ref for caller AI)
  if (existsSync(sourceAispQuickRef)) {
    copySync(sourceAispQuickRef, join(skillDestDir, 'aisp-quick-ref.md'));
    log(`  → aisp-quick-ref.md (quick ref for Caller AI)`, 'green');
  }

  // Copy executables
  log(`Copying executables to scripts/...`, 'blue');
  if (hasWindowsExe) {
    copySync(sourceWindowsExe, join(skillScriptsDir, 'adviser.exe'));
    log(`  → scripts/adviser.exe`, 'green');
  }
  if (hasLinuxExe) {
    copySync(sourceLinuxExe, join(skillScriptsDir, 'adviser'));
    chmodSync(join(skillScriptsDir, 'adviser'), 0o755);
    log(`  → scripts/adviser`, 'green');
  }

  // Copy examples
  const sourceExamplesDir = join(sourceSkillDir, 'examples');
  const destExamplesDir = join(skillDestDir, 'examples');
  if (existsSync(sourceExamplesDir)) {
    log(`Copying examples...`, 'blue');
    copySync(sourceExamplesDir, destExamplesDir);
    log(`  → examples/`, 'green');
  }

  // Copy workflows
  const sourceWorkflowsDir = join(process.cwd(), 'workflows');
  log(`Copying workflow files to ${workflowDirName}/...`, 'blue');
  const copiedWorkflows = copyWorkflows(sourceWorkflowsDir, destWorkflowsDir, agentDirName);

  // Copy protocols
  const sourceProtocolsDir = join(process.cwd(), 'protocols');
  const destProtocolsDir = join(resolvedDest, agentDirName, 'protocols');
  log(`Copying protocol files to protocols/...`, 'blue');
  const copiedProtocols = copyProtocols(sourceProtocolsDir, destProtocolsDir);
  if (copiedProtocols.length > 0) {
    for (const p of copiedProtocols) {
      log(`  → protocols/${p}`, 'green');
    }
  }

  // Summary
  log('\n=== Deployment Complete ===', 'bright');
  log(`Skill deployed to: ${skillDestDir}`, 'green');
  if (copiedWorkflows.length > 0) {
    log(`${agentDirName === '.claude' ? 'Commands' : 'Workflows'} deployed to: ${destWorkflowsDir}`, 'green');
  }
  if (copiedProtocols.length > 0) {
    log(`Protocols deployed to: ${destProtocolsDir}`, 'green');
  }
  log('\nDirectory structure:', 'blue');
  log(`  ${agentDirName}/skills/${skillName}/`, 'blue');
  log(`  ├── SKILL.md`, 'blue');
  log(`  └── scripts/`, 'blue');
  if (hasWindowsExe) {
    log(`      ├── adviser.exe     (Windows executable)`, 'blue');
  }
  if (hasLinuxExe) {
    log(`      ├── adviser         (Linux executable)`, 'blue');
  }
  log(`  └── examples/`, 'blue');
  log(`      └── usage.md`, 'blue');
  if (copiedWorkflows.length > 0) {
    log(`  ${agentDirName}/${workflowDirName}/`, 'blue');
    for (const wf of copiedWorkflows) {
      log(`  ├── ${wf}`, 'blue');
    }
  }
  if (copiedProtocols.length > 0) {
    log(`  ${agentDirName}/protocols/`, 'blue');
    for (const p of copiedProtocols) {
      log(`  ├── ${p}`, 'blue');
    }
  }

  log('\n✨ No Bun runtime required on target machine!', 'bright');
  log('\nTo use the skill in your project:', 'bright');

  if (hasWindowsExe) {
    log(`  Windows: ${agentDirName === '.agent' ? '.agent' : '.claude'}\\skills\\${skillName}\\scripts\\adviser.exe <taskType> -c <context>`, 'green');
  }
  if (hasLinuxExe) {
    log(`  Linux:   ${agentDirName}/skills/${skillName}/scripts/adviser <taskType> -c <context>`, 'green');
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
function parseArgs(): { destination: string | null, targetDir: string } {
  const args = process.argv.slice(2);
  let destination: string | null = null;
  let targetDir = '.agent';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg === '--claude') {
      targetDir = '.claude';
    } else if (arg === '--target-dir' && args[i + 1]) {
      targetDir = args[i + 1] as string;
      i++;
    } else if (arg && !destination && !arg.startsWith('-')) {
      destination = arg;
    }
  }

  return { destination, targetDir };
}

function printUsage() {
  console.log(`
Usage: bun deploy-skill.ts [destination] [--claude]

Deploy the adviser skill to a Claude Code project.

This deploys self-contained executables - no Bun runtime required on target!

Arguments:
  destination    Path to the project directory (default: prompt for input)

Options:
  --claude       Deploy to .claude directory (default: .agent)
  -h, --help     Show this help message

Examples:
  bun deploy-skill.ts                    # Interactive prompt for destination
  bun deploy-skill.ts /path/to/project   # Deploy to .agent in specific project
  bun deploy-skill.ts . --claude         # Deploy to .claude in current dir

The skill will be deployed to:
  <destination>/.agent/skills/adviser/   (default)
  <destination>/.claude/skills/adviser/  (with --claude)

Deployed files:
  - adviser.exe   (Windows x64 executable)
  - adviser       (Linux x64 executable)
  - SKILL.md      (Documentation)
  - examples/     (Usage examples)

Prerequisites on target machine:
  - Claude Code CLI (authenticated via 'claude login')
  - Must have run 'claude --dangerously-skip-permissions' once

For more information, see:
  https://code.claude.com/docs/en/skills
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
  const { destination, targetDir } = parseArgs();

  if (destination === null) {
    const dest = await interactiveDestination();
    await deploy(dest, targetDir);
  } else {
    await deploy(destination, targetDir);
  }
}

// Run
if (import.meta.main) {
  main().catch((err) => {
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
