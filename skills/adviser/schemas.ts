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
  persona: string;
};
