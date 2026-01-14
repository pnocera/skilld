import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { join } from 'node:path';
import { getOutputDir } from './output';
import { rmSync } from 'node:fs';

let tempdir: string;

beforeEach(() => {
  tempdir = join(process.cwd(), 'test-temp-' + Date.now());
  // Create temp directory with package.json to simulate project root
  const fs = require('node:fs');
  fs.mkdirSync(tempdir, { recursive: true });
  fs.writeFileSync(join(tempdir, 'package.json'), '{}');
  // Save original cwd
  process.env.ORIGINAL_CWD = process.cwd();
  process.chdir(tempdir);
});

afterEach(() => {
  // Restore original cwd
  if (process.env.ORIGINAL_CWD) {
    process.chdir(process.env.ORIGINAL_CWD);
    delete process.env.ORIGINAL_CWD;
  }
  // Cleanup tempdir
  try {
    rmSync(tempdir, { recursive: true, force: true });
  } catch {}
});

describe('CLI Integration Tests', () => {
  describe('Output path resolution', () => {
    test('resolves to project root when ADVISED_OUTPUT_DIR not set', () => {
      const dir = getOutputDir();
      expect(dir).toBe(join(tempdir, 'docs/reviews'));
    });

    test('resolves to environment variable when set', () => {
      const customDir = '/tmp/custom-output';
      process.env.ADVISED_OUTPUT_DIR = customDir;
      const dir = getOutputDir();
      expect(dir).toBe(customDir);
      delete process.env.ADVISED_OUTPUT_DIR;
    });

    test('resolves absolute path from environment variable', () => {
      const customDir = join(process.cwd(), 'custom-out');
      process.env.ADVISED_OUTPUT_DIR = customDir;
      const dir = getOutputDir();
      expect(dir).toMatch(/^\/.*\/custom-out$/);
      delete process.env.ADVISED_OUTPUT_DIR;
    });
  });

  describe('File-based input', () => {
    test('reads context from file', async () => {
      const testFile = join(tempdir, 'test-context.txt');
      await Bun.write(testFile, 'This is sample context for analysis');
      const content = await Bun.file(testFile).text();
      expect(content).toBe('This is sample context for analysis');
    });

    test('handles non-existent file gracefully', async () => {
      const nonExistent = join(tempdir, 'does-not-exist.txt');
      const file = Bun.file(nonExistent);
      expect(await file.exists()).toBe(false);
    });
  });

  describe('Schema validation edge cases', () => {
    test('validates correct schema structure', () => {
      const testResult = {
        summary: 'A valid summary',
        issues: [
          {
            severity: 'high',
            description: 'An issue description',
            location: 'file.ts:10',
            recommendation: 'Fix it'
          }
        ],
        suggestions: ['Suggestion 1', 'Suggestion 2']
      };

      const AnalysisSchema = require('./schemas').AnalysisSchema;
      const parsed = AnalysisSchema.safeParse(testResult);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.issues[0].severity).toBe('high');
      }
    });
  });
});
