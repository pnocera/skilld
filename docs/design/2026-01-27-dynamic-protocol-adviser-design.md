# Dynamic Protocol-Based Adviser Design

**Date:** 2026-01-27  
**Status:** Exploratory Design  
**Adviser Review:** Reject (see [Future Work](#future-work) for required refinements)

---

## Overview

Transform the adviser from a static, task-type-bound tool into a dynamic, protocol-driven universal adviser. Instead of fixed personas (architect, strategist, auditor), the consuming agent discovers and composes relevant AISP protocols at runtime.

**Core Principle**: The intelligence moves upstream to the calling agent. The adviser tool becomes a thin LLM executor.

---

## Architecture

The system consists of three layers:

### 1. Protocol Layer (`protocols/*.aisp`)

Self-describing AISP specification files. Each protocol contains:
- Header with domain (`γ≔`), tags (`ρ≔`), and claims (`⊢`)
- Formal rules (`⟦Γ⟧`), functions (`⟦Λ⟧`), and validation logic
- Protocols are independent, composable units of reasoning guidance

### 2. Skill Layer (`skills/adviser/`)

A simplified adviser tool that accepts:
- `--prompt-file <path>`: Path to composed system prompt
- `--input <file>`: Content to analyze
- `--mode <aisp|human|workflow>`: Output format
- `--output`, `--output-dir`, `--timeout`: Existing options retained

The tool contains **zero domain knowledge**—it's a pure LLM executor.

### 3. Agent Layer (LLM runtime)

The consuming agent (e.g., Claude running a workflow) is responsible for:
- Scanning `protocols/` directory using `list_dir`
- Reading protocol headers to understand domain/tags
- Selecting protocols relevant to the current activity
- Composing a unified prompt with preamble + concatenated protocols
- Writing the prompt to `./tmp/adviser-prompt-<uuid>.md`
- Executing: `adviser --prompt-file ./tmp/... --input <file> --mode aisp`
- Parsing the AISP output for verdict and issues

### Data Flow

```
Activity Context → Agent selects protocols → Compose prompt → Write temp file
    → adviser --prompt-file ... → LLM analysis → AISP output → Agent parses verdict
```

---

## Protocol Structure & Discovery

### Protocol Self-Description Convention

Every AISP protocol follows a standard header structure that enables discovery:

```aisp
𝔸<version>.<name>@<date>
γ≔<domain.path>              ;; Hierarchical domain identifier
ρ≔⟨tag1,tag2,tag3,...⟩       ;; Semantic tags for matching
⊢<claim1>∧<claim2>∧...       ;; Formal claims/dependencies
```

**Example from `solid.aisp`:**
```aisp
𝔸5.1.solid-codegen@2026-01-18
γ≔software.architecture.solid.principles
ρ≔⟨SRP,OCP,LSP,ISP,DIP,codegen,validation⟩
⊢SOLID∧OOP∧FP∧modular
```

### Discovery Process

The consuming agent performs discovery by:

1. **Enumerate**: `list_dir` on `protocols/` → get all `.aisp` files
2. **Scan headers**: For each file, read first 5-10 lines to extract:
   - `γ` (domain): e.g., `software.architecture`, `knowledge.graph`
   - `ρ` (tags): List of concept keywords
   - `⊢` (claims): Formal guarantees/dependencies
3. **Match**: Compare extracted metadata against activity context:
   - Design work → match `architecture`, `design`, `SOLID`
   - Planning → match `workflow`, `sequence`, `YAGNI`
   - Verification → match `validation`, `triangulation`, `quality`
4. **Select**: Choose 1-4 most relevant protocols (token budget consideration)

### Matching Heuristics

The agent uses semantic reasoning to match:
- **Domain prefix matching**: Activity "code architecture review" → `γ≔software.architecture.*`
- **Tag intersection**: Activity mentions "dependencies" → protocols with `DIP` or `deps` tags
- **Claim compatibility**: Activity requires safety → protocols claiming `∧SAFE` or `∧verification`

---

## Prompt Composition

### Composed Prompt Structure

The agent writes a composed prompt file with this structure:

```markdown
# Dynamic Adviser Prompt

## Role & Objective
You are an expert adviser analyzing the provided input. Apply the protocols 
below rigorously to identify issues, gaps, and recommendations.

## Activity Context
[Agent-generated description of current activity, e.g.:]
- Activity: Design review for authentication system refactor
- Focus areas: Security, extensibility, error handling
- Expected output: AISP verdict with categorized issues

## Protocols to Apply

### Protocol 1: SOLID Principles
<protocol>
[Full content of solid.aisp]
</protocol>

### Protocol 2: Adviser Flow
<protocol>
[Full content of flow.aisp]
</protocol>

## Output Requirements
Respond in AISP 5.1 format. Your response MUST:
1. Start with header: 𝔸1.0.adviser@YYYY-MM-DD
2. Include required blocks: ⟦Ω⟧, ⟦Σ⟧, ⟦Γ⟧, ⟦Λ⟧, ⟦Ε⟧
3. Categorize issues by severity: ⊘ (critical), ◊⁻ (high), ◊ (medium), ◊⁺ (low)
4. Conclude with verdict: ⊢Verdict(approve|revise|reject)

## Input to Analyze
[Loaded separately via --input flag]
```

### Key Composition Rules

1. **Preamble sets context**: The activity description primes the LLM for the specific task
2. **Protocols wrapped in tags**: `<protocol>` delimiters help the LLM parse boundaries
3. **Output format enforced**: Explicit AISP requirements ensure structured response
4. **Input separate**: The `--input` file is loaded by the adviser tool, not embedded in prompt

### Token Budget

Typical composition sizes:
- Preamble: ~200 tokens
- Per protocol: 2,000-5,000 tokens
- 2-3 protocols total: 6,000-15,000 tokens
- Leaves ample room for input + output in 100k+ context windows

---

## Adviser Tool Interface

### New Command Interface

The adviser CLI is simplified to a pure executor:

```bash
adviser --prompt-file <path> --input <file> [options]
```

**Required Arguments:**
| Argument | Description |
|----------|-------------|
| `--prompt-file, -p` | Path to composed system prompt (replaces task types) |
| `--input, -i` | Path to content to analyze |

**Optional Arguments (unchanged):**
| Argument | Description |
|----------|-------------|
| `--output, -o` | Explicit output file path |
| `--output-dir` | Output directory (default: `docs/reviews/`) |
| `--mode, -m` | Output format: `aisp` (default), `human`, `workflow` |
| `--timeout, -t` | Timeout in ms (default: 1,800,000) |

### Removed Concepts

- ❌ `<taskType>` positional argument (design-review, plan-analysis, code-verification)
- ❌ `motifs/` folder with fixed persona prompts (architect.txt, strategist.txt, auditor.txt)
- ❌ `getPersonaPrompt()` function and persona mapping

### Implementation Changes

```typescript
// OLD: Fixed persona lookup
const systemPrompt = getPersonaPrompt(taskType, mode);

// NEW: Read from provided file
const systemPrompt = await Bun.file(promptFile).text();
```

The tool becomes ~50% smaller—just argument parsing, prompt loading, LLM execution, and output handling.

### Error Cases

| Scenario | Behavior |
|----------|----------|
| `--prompt-file` missing | Error: "Required: --prompt-file (-p)" |
| Prompt file not found | Error: "Prompt file not found: <path>" |
| Prompt file empty | Error: "Prompt file is empty" |
| Existing errors | Unchanged (input validation, timeout, etc.) |

---

## Updated SKILL.md Documentation

The `skills/adviser/SKILL.md` becomes the single source of truth:

### Step 1: Discover Protocols
Scan `protocols/*.aisp` and read headers to find relevant protocols:
- `γ≔` — Domain path (e.g., `software.architecture`)
- `ρ≔` — Tags (e.g., `⟨SRP,OCP,validation⟩`)
- `⊢` — Claims (e.g., `SOLID∧YAGNI`)

Match protocols to your activity context.

### Step 2: Compose Prompt
Write a prompt file to `./tmp/adviser-prompt-<uuid>.md` containing:
1. Role & objective preamble
2. Activity context description  
3. Selected protocols (full content, wrapped in `<protocol>` tags)
4. AISP 5.1 output requirements

### Step 3: Execute
```bash
adviser --prompt-file ./tmp/adviser-prompt-<uuid>.md \
        --input <file-to-analyze> \
        --mode aisp
```

### Step 4: Parse Output
Read the manifest from stdout to find the `.aisp` output file.
Parse for: `⊢Verdict(approve|revise|reject)` and issue list.

### Protocol Selection Examples
| Activity | Recommended Protocols |
|----------|----------------------|
| Architecture review | `solid.aisp`, `flow.aisp` |
| Implementation planning | `flow.aisp`, `yagni.aisp` |
| Code verification | `solid.aisp`, `triangulation.aisp` |
| Cost analysis | `cost-analysis.aisp`, `yagni.aisp` |

---

## Workflow Migration

### Updated Workflow Pattern

Existing workflows change from task-type references to skill-based instructions:

**Before (brainstorm.md):**
```markdown
## Final Adviser Review
3. Run: `adviser design-review --input ./tmp/design.md --mode aisp`
```

**After:**
```markdown
## Final Adviser Review
3. Use adviser per SKILL.md:
   - Discover protocols from `protocols/` matching design review
   - Compose prompt with selected protocols
   - Run: `adviser --prompt-file <composed> --input ./tmp/design.md --mode aisp`
```

### Workflows Requiring Updates

| Workflow | Current Task Type | Likely Protocols |
|----------|-------------------|------------------|
| `brainstorm.md` | `design-review` | `solid.aisp`, `flow.aisp` |
| `writing-plan.md` | `plan-analysis` | `flow.aisp`, `yagni.aisp` |
| `execute-plan.md` | `code-verification` | `solid.aisp`, `triangulation.aisp` |
| `review.md` | varies | Agent-selected based on context |

### Migration Simplicity

Because the agent reads SKILL.md dynamically, the workflow changes are minimal:
- Remove explicit task types
- Add "per SKILL.md" directive
- Agent handles the rest

### Files to Remove

After migration, these become obsolete:
- `skills/adviser/motifs/architect.txt`
- `skills/adviser/motifs/strategist.txt`  
- `skills/adviser/motifs/auditor.txt`
- `skills/adviser/motifs.ts` (persona mapping logic)

**Retained:**
- `skills/adviser/motifs/aisp-spec.md` — Still useful as AISP reference
- `skills/adviser/motifs/aisp-quick-ref.md` — Quick reference for parsing

---

## Benefits

1. **Generic**: Works for any activity, not just 3 fixed task types
2. **Extensible**: Add new protocols without changing the adviser tool
3. **Composable**: Mix and match protocols for complex activities
4. **Simpler tool**: Adviser becomes a thin executor (~50% less code)
5. **Agent-driven**: Intelligence at the orchestration layer
6. **Self-documenting**: Protocols describe their own applicability

## Trade-offs

1. **Token cost**: Full protocol concatenation uses more tokens than fixed prompts
2. **Agent capability**: Requires capable LLM for protocol selection
3. **Discovery overhead**: Agent must scan and reason about protocols each time
4. **No fallback**: Removing fixed task types means no simple mode for quick use

---

## Future Work

The adviser review identified critical and high-priority issues that must be addressed before implementation:

### Critical Issues (Must Resolve)

| Issue | Description | Recommended Action |
|-------|-------------|-------------------|
| **Protocol Schema Specification** | No formal schema for protocol structure | Define complete AISP protocol schema with required/optional blocks |
| **Fallback Strategy** | No handling for discovery failures | Implement multi-tier fallback: skip corrupt → use default → escalate |
| **Conflict Resolution** | No strategy for incompatible protocols | Define protocol compatibility matrix and resolution hierarchy |
| **Migration Strategy** | Incomplete migration path | Create detailed migration plan with feature flags and rollback |
| **Token Budget Validation** | Estimates are unverified | Conduct empirical analysis of actual protocol sizes |

### High-Priority Issues

| Issue | Description |
|-------|-------------|
| Protocol validation mechanism | How to validate AISP syntax before use |
| Agent capability requirements | Minimum LLM specifications needed |
| Protocol versioning strategy | Semantic versioning and compatibility |
| Matching heuristics specification | Formal scoring algorithm for selection |
| Discovery performance | Quantify scanning latency |
| Workflow error handling | Timeouts, retries, failure modes |
| Deprecation period | Keep persona files during transition |

### Adviser Loop Summary

- **Review Type**: design-review
- **Iterations**: 1
- **Verdict**: reject (5 critical, 7 high issues)
- **Output**: `docs/reviews/review-design-review-1769531577865-0d4v.aisp`

---

## Appendix: Design Decisions

| Decision Point | Choice | Rationale |
|----------------|--------|-----------|
| Protocol discovery | Convention-based (scan headers) | Self-describing, no manifest to maintain |
| Prompt composition | Full concatenation | Preserves all context, modern context windows handle it |
| Tool interface | `--prompt-file` injection | Keeps tool simple, intelligence upstream |
| Backward compatibility | Clean break | No legacy cruft, cleaner mental model |
| Discovery tooling | Pure LLM reasoning | Agent already has list_dir/view_file |
| Documentation | SKILL.md as source of truth | Single point of reference, DRY |

---

*Design authored via brainstorm workflow. Tagged `before_generic` for pre-implementation reference.*
