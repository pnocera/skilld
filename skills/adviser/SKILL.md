---
name: adviser
description: Protocol-driven analysis executor. The consuming agent discovers relevant protocols, composes a prompt, and calls this tool.
---

# Adviser Skill

A protocol-driven analysis executor. The consuming agent discovers relevant AISP protocols from `protocols/`, composes a prompt, and calls this tool to execute analysis.

## How to Use

### Step 1: Discover Protocols

Scan `protocols/*.aisp` and read headers to find relevant protocols:

```aisp
𝔸<version>.<name>@<date>
γ≔<domain.path>        ;; Domain (e.g., software.architecture)
ρ≔⟨tag1,tag2,...⟩      ;; Tags for matching
⊢<claims>              ;; Formal claims
```

**Match protocols to your activity context using semantic reasoning:**

- **Domain matching**: Activity "code architecture review" → `γ≔software.architecture.*`
- **Tag intersection**: Activity mentions "dependencies" → protocols with `DIP` or `deps` tags
- **Claim compatibility**: Activity requires validation → protocols claiming `∧verification`

### Step 2: Compose Prompt

Write a prompt file to `./tmp/adviser-prompt-<activity>-<timestamp>.md` containing:

1. **Role & Objective** - Prime the LLM for the analysis task
2. **Activity Context** - Describe what you're analyzing and why
3. **Protocols** - Full content of selected protocols wrapped in `<protocol>` tags
4. **Output Requirements** - AISP 5.1 format requirements

**Example structure:**

```markdown
# Dynamic Adviser Prompt

## Role & Objective
You are an expert adviser analyzing the provided input. Apply the protocols 
below rigorously to identify issues, gaps, and recommendations.

## Activity Context
- Activity: Design review for authentication system refactor
- Focus areas: Security, extensibility, error handling
- Expected output: AISP verdict with categorized issues

## Protocols to Apply

### Protocol: SOLID Principles
<protocol>
[Full content of solid.aisp]
</protocol>

### Protocol: Adviser Flow
<protocol>
[Full content of flow.aisp]
</protocol>

## Output Requirements
Respond in AISP 5.1 format. Your response MUST:
1. Start with header: 𝔸1.0.adviser@YYYY-MM-DD
2. Include required blocks: ⟦Ω⟧, ⟦Σ⟧, ⟦Γ⟧, ⟦Λ⟧, ⟦Ε⟧
3. Categorize issues by severity: ⊘ (critical), ◊⁻ (high), ◊ (medium), ◊⁺ (low)
4. Conclude with verdict: ⊢Verdict(approve|revise|reject)

Return a JSON object with:
- summary: Brief overview of findings
- issues: Array of {severity, description, location?, recommendation?}
- suggestions: Array of improvement recommendations
```

**Important:** Keep generated prompts in `./tmp/` for analysis and SKILL.md improvement.

### Step 3: Execute

```bash
adviser --prompt-file ./tmp/adviser-prompt-<activity>-<timestamp>.md \
        --input <file-to-analyze> \
        --mode aisp
```

### Step 4: Parse Output

Read the manifest from stdout to find the `.aisp` output file:
```
[Adviser] Output manifest: /path/to/review.aisp.manifest.json
```

Parse the AISP file for:
- `⊢Verdict(approve|revise|reject)` — Final verdict
- Issue counts in `⟦Σ:Types⟧` block
- Individual issues in `⟦Λ:Analysis⟧` block

## Command Reference

```
adviser --prompt-file <path> --input <file> [options]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `--prompt-file, -p` | Yes | Path to composed system prompt |
| `--input, -i` | Yes | Path to content to analyze |
| `--mode, -m` | No | Output: aisp (default), human, workflow |
| `--output, -o` | No | Explicit output path |
| `--output-dir` | No | Output directory (default: docs/reviews/) |
| `--timeout, -t` | No | Timeout in ms (default: 1,800,000) |

## Protocol Selection Examples

| Activity | Recommended Protocols | Rationale |
|----------|----------------------|-----------|
| Architecture review | `solid.aisp`, `flow.aisp` | SOLID principles + workflow structure |
| Implementation planning | `flow.aisp`, `yagni.aisp` | Task flow + necessity validation |
| Code verification | `solid.aisp`, `triangulation.aisp` | Code quality + multi-pass verification |
| Cost analysis | `yagni.aisp` | Focus on necessity and efficiency |

## AISP Output Reference

See `motifs/aisp-quick-ref.md` for interpreting AISP output:

| Symbol | Meaning |
|--------|---------|
| `⊢Verdict(approve)` | Pass - proceed with work |
| `⊢Verdict(revise)` | Needs changes - address high issues |
| `⊢Verdict(reject)` | Critical issues - significant rework needed |
| `⊘` | Critical severity |
| `◊⁻` | High severity |
| `◊` | Medium severity |
| `◊⁺` | Low severity |

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "Missing required --prompt-file" | No prompt provided | Create prompt file per Step 2 |
| "Prompt file not found" | Invalid path | Check path exists |
| "Prompt file is empty" | Empty file | Add content per Step 2 template |
| "Input file not found" | Invalid input path | Verify input file exists |

## Prompt Preservation

Generated prompts should be **preserved** for analysis:

- Helps improve SKILL.md instructions
- Reveals agent reasoning patterns
- Identifies protocol selection heuristics that work well
- Use naming: `adviser-prompt-<activity>-<timestamp>.md`
