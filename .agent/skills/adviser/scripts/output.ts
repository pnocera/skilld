import type { OutputMode, PersonaType } from './types';
import type { AnalysisResult } from './schemas';
import { join, resolve } from 'node:path';

/**
 * Resolve output directory for review files.
 * Prioritizes:
 * 1. ADVISED_OUTPUT_DIR environment variable
 * 2. Project root/docs/reviews (default)
 */
export function getOutputDir(): string {
  const envDir = process.env.ADVISED_OUTPUT_DIR;
  if (envDir) {
    return resolve(envDir);
  }

  // Find project root (look for package.json)
  let cwd = process.cwd();
  let searchDir = cwd;
  const maxDepth = 10;

  for (let i = 0; i < maxDepth; i++) {
    const packageJsonPath = join(searchDir, 'package.json');
    try {
      // Check if package.json exists
      const fs = require('node:fs');
      if (fs.existsSync(packageJsonPath)) {
        return join(searchDir, 'docs/reviews');
      }
    } catch {}
    const parent = join(searchDir, '..');
    if (parent === searchDir) break; // reached filesystem root
    searchDir = parent;
  }

  // Fallback: use cwd/docs/reviews
  return join(cwd, 'docs/reviews');
}

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
  const baseDir = getOutputDir();
  const path = join(baseDir, filename);

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
      markdown += `${suggestion}\n`;
    }
  }

  const fs = await import('node:fs');
  fs.mkdirSync(baseDir, { recursive: true });

  await Bun.write(path, markdown);

  return `Review saved to: ${path}`;
}
