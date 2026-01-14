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
    } catch { }
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

  if (mode === 'aisp') {
    // AISP 5.1 Platinum Specification format
    const today = new Date().toISOString().split('T')[0];
    const personaMap: Record<PersonaType, string> = {
      'design-review': 'architect',
      'plan-analysis': 'strategist',
      'code-verification': 'auditor'
    };
    const persona = personaMap[type];

    // Convert severity to AISP tier
    const severityToTier: Record<string, string> = {
      'critical': '⊘',
      'high': '◊⁻',
      'medium': '◊',
      'low': '◊⁺'
    };

    // Count issues by severity
    const issueCounts = result.issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Determine verdict
    let verdict = 'approve';
    if ((issueCounts['critical'] || 0) > 0) verdict = 'reject';
    else if ((issueCounts['high'] || 0) > 2) verdict = 'revise';

    // Build AISP document
    let aisp = `𝔸1.0.${persona}@${today}
γ≔${type.replace(/-/g, '.')}
ρ≔⟨analysis,issues,suggestions⟩
⊢ND∧review.complete

;; ─── Ω: META ───
⟦Ω:Meta⟧{
  ∀D: Ambig(D) < 0.02
  ⊢ review.complete
  timestamp≜"${result.timestamp}"
}

;; ─── Σ: TYPES ───
⟦Σ:Types⟧{
  Issue ≜ ⟨severity: {critical,high,medium,low}, desc: 𝕊, loc?: 𝕊, rec?: 𝕊⟩
  Verdict ≜ {approve, revise, reject}
  Counts ≜ ⟨critical: ${issueCounts['critical'] || 0}, high: ${issueCounts['high'] || 0}, medium: ${issueCounts['medium'] || 0}, low: ${issueCounts['low'] || 0}⟩
}

;; ─── Γ: RULES ───
⟦Γ:Rules⟧{
  issues.critical > 0 ⇒ Verdict(reject)
  issues.high > 2 ⇒ Verdict(revise)
  _ ⇒ Verdict(approve)
  ⊢ Verdict(${verdict})
}

;; ─── Λ: ANALYSIS ───
⟦Λ:Analysis⟧{
  ;; Summary
  summary≜"${result.summary.replace(/"/g, '\\"').replace(/\n/g, ' ')}"

  ;; Issues (${result.issues.length})
`;

    for (let i = 0; i < result.issues.length; i++) {
      const issue = result.issues[i];
      if (!issue) continue;
      const tier = severityToTier[issue.severity] || '◊';
      aisp += `  issue[${i}]≜⟨τ:${tier}, sev:"${issue.severity}", desc:"${issue.description.replace(/"/g, '\\"').substring(0, 100)}..."`;
      if (issue.location) aisp += `, loc:"${issue.location.replace(/"/g, '\\"')}"`;
      if (issue.recommendation) aisp += `, rec:"${issue.recommendation.replace(/"/g, '\\"').substring(0, 80)}..."`;
      aisp += `⟩\n`;
    }

    aisp += `
  ;; Suggestions (${result.suggestions.length})
`;
    for (let i = 0; i < result.suggestions.length; i++) {
      const suggestion = result.suggestions[i];
      if (!suggestion) continue;
      aisp += `  suggest[${i}]≜"${suggestion.replace(/"/g, '\\"').substring(0, 100)}..."\n`;
    }

    aisp += `}

;; ─── Ε: EVIDENCE ───
⟦Ε⟧⟨
  δ≜0.85
  φ≜${100 - (issueCounts['critical'] || 0) * 20 - (issueCounts['high'] || 0) * 10}
  τ≜${verdict === 'approve' ? '◊⁺' : verdict === 'revise' ? '◊' : '⊘'}
  ⊢ND
  ⊢Verdict(${verdict})
  ⊢issues.total=${result.issues.length}
  ⊢suggestions.total=${result.suggestions.length}
⟩
`;

    // Save AISP document
    const filename = `review-${type}-${Date.now()}.aisp`;
    const baseDir = getOutputDir();
    const path = join(baseDir, filename);

    const fs = await import('node:fs');
    fs.mkdirSync(baseDir, { recursive: true });
    await Bun.write(path, aisp);

    return `AISP review saved to: ${path}\n\n${aisp}`;
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
