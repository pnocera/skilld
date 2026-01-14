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
  const baseDir = process.env.ADVISED_OUTPUT_DIR || 'docs/reviews';
  const path = join(process.cwd(), baseDir, filename);

  // Build Markdown content
  let markdown = `# ${type.replace(/-/g, ' ').toUpperCase()} Review\n\n`;
  markdown += `**Date:** ${new Date(result.timestamp).ISOString()}\n\n`;
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
    markdown += '## suggestions\n\n';
    for (const suggestion of result.suggestions) {
      markdown += `${suggestion}\n`;
    }
  }

  const fs = await import('node:fs');
  fs.mkdirSync(join(process.cwd(), baseDir), { recursive: true });

  await Bun.write(path, markdown);

  return `Review saved to: ${path}`;
}
