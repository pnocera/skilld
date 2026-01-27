import type { OutputMode, OutputManifest, OutputAsset } from './types';
import type { AnalysisResult } from './schemas';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Constants
const MAX_DIR_SEARCH_DEPTH = 10;
const TRUNCATION_LENGTH_DESCRIPTION = 100;
const TRUNCATION_LENGTH_RECOMMENDATION = 80;

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

  for (let i = 0; i < MAX_DIR_SEARCH_DEPTH; i++) {
    const packageJsonPath = join(searchDir, 'package.json');
    if (existsSync(packageJsonPath)) {
      return join(searchDir, 'docs/reviews');
    }
    const parent = join(searchDir, '..');
    if (parent === searchDir) break; // reached filesystem root
    searchDir = parent;
  }

  // Fallback: use cwd/docs/reviews
  return join(cwd, 'docs/reviews');
}

/**
 * Write manifest file listing created assets
 */
async function writeManifest(
  outputPath: string,
  mode: OutputMode,
  assets: OutputAsset[]
): Promise<string> {
  const manifest: OutputManifest = {
    status: 'success',
    mode,
    assets,
    timestamp: new Date().toISOString()
  };

  // Manifest file is named after the main output with .manifest.json suffix
  const manifestPath = outputPath + '.manifest.json';
  await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

/**
 * Generate a short unique ID for filenames
 */
function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 6);
}

/**
 * Ensure directory exists, creating it if necessary
 */
function ensureDirectory(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/**
 * Resolve output path and ensure directory exists
 */
function resolveOutputPath(outputFile: string | undefined, baseDir: string, explicitFilename: string): { path: string } {
  const filename = outputFile ?? explicitFilename;
  const path = outputFile?.startsWith('/') ? outputFile : join(baseDir, filename);
  const dir = outputFile?.startsWith('/') ? resolve(outputFile, '..') : baseDir;
  ensureDirectory(dir);
  return { path };
}

/**
 * Escape JSON string values
 */
function escapeJsonString(value: string): string {
  return value.replace(/"/g, '\\"');
}

/**
 * Truncate string to maximum length with ellipsis
 */
function truncateString(value: string, maxLength: number): string {
  return value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
}

// === Format Functions ===

/**
 * Format output as workflow JSON
 */
function formatWorkflow(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format output as AISP 5.1 Platinum Specification
 * Uses generic "adviser" header since we no longer have fixed personas
 */
function formatAisp(result: AnalysisResult): string {
  const today = new Date().toISOString().split('T')[0];

  const severityToTier: Record<string, string> = {
    'critical': '⊘',
    'high': '◊⁻',
    'medium': '◊',
    'low': '◊⁺'
  };

  const issueCounts = result.issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let verdict = 'approve';
  if ((issueCounts['critical'] || 0) > 0) verdict = 'reject';
  else if ((issueCounts['high'] || 0) > 2) verdict = 'revise';

  let aisp = `𝔸1.0.adviser@${today}
γ≔dynamic.analysis
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
  summary≜"${escapeJsonString(result.summary).replace(/\n/g, ' ')}"

  ;; Issues (${result.issues.length})
`;

  for (let i = 0; i < result.issues.length; i++) {
    const issue = result.issues[i];
    if (!issue) continue;
    const tier = severityToTier[issue.severity] || '◊';
    const desc = truncateString(escapeJsonString(issue.description), TRUNCATION_LENGTH_DESCRIPTION);
    const rec = issue.recommendation
      ? `, rec:"${truncateString(escapeJsonString(issue.recommendation), TRUNCATION_LENGTH_RECOMMENDATION)}"`
      : '';
    const loc = issue.location ? `, loc:"${escapeJsonString(issue.location)}"` : '';
    aisp += `  issue[${i}]≜⟨τ:${tier}, sev:"${issue.severity}", desc:"${desc}"${loc}${rec}⟩\n`;
  }

  aisp += `
  ;; Suggestions (${result.suggestions.length})
`;
  for (let i = 0; i < result.suggestions.length; i++) {
    const suggestion = result.suggestions[i];
    if (!suggestion) continue;
    aisp += `  suggest[${i}]≜"${truncateString(escapeJsonString(suggestion), TRUNCATION_LENGTH_DESCRIPTION)}"\n`;
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

  return aisp;
}

/**
 * Format output as human-readable markdown
 */
function formatHuman(result: AnalysisResult): string {
  let markdown = `# Adviser Review\n\n`;
  markdown += `**Date:** ${new Date(result.timestamp).toISOString()}\n\n`;
  markdown += `## Summary\n\n${result.summary}\n\n`;

  if (result.issues.length > 0) {
    markdown += `## Issues (${result.issues.length})\n\n`;
    const emoji: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    for (const issue of result.issues) {
      markdown += `### ${emoji[issue.severity]} ${issue.severity.toUpperCase()}\n`;
      markdown += `${issue.description}\n`;
      if (issue.location) markdown += `**Location:** ${issue.location}\n`;
      if (issue.recommendation) markdown += `**Recommendation:** ${issue.recommendation}\n`;
      markdown += '\n';
    }
  }

  if (result.suggestions.length > 0) {
    markdown += '## Suggestions\n\n';
    for (const suggestion of result.suggestions) {
      markdown += `- ${suggestion}\n`;
    }
  }

  return markdown;
}

export async function handleOutput(
  result: AnalysisResult,
  mode: OutputMode,
  outputFile?: string,
  outputDir?: string
): Promise<string> {
  const baseDir = outputDir ? resolve(outputDir) : getOutputDir();

  // Map mode to format function and file extension
  let content: string;
  let extension: string;
  let assetType: OutputAsset['type'];
  let assetFormat: OutputAsset['format'];

  switch (mode) {
    case 'workflow':
      content = formatWorkflow(result);
      extension = 'json';
      assetType = 'workflow';
      assetFormat = 'json';
      break;
    case 'aisp':
      content = formatAisp(result);
      extension = 'aisp';
      assetType = 'aisp';
      assetFormat = 'aisp';
      break;
    case 'human':
    default:
      content = formatHuman(result);
      extension = 'md';
      assetType = 'review';
      assetFormat = 'md';
      break;
  }

  const explicitFilename = `review-${Date.now()}-${generateUniqueId()}.${extension}`;
  const { path } = resolveOutputPath(outputFile, baseDir, explicitFilename);

  await Bun.write(path, content);

  const manifestPath = await writeManifest(path, mode, [
    { type: assetType, format: assetFormat, path }
  ]);

  return `[Adviser] Output manifest: ${manifestPath}`;
}
