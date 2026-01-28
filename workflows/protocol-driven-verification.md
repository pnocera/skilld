---
description: "Apply formal AISP protocols for rigorous verification of designs, plans, and code - use when high-fidelity validation is required"
---

# Protocol-Driven Verification

## Overview

Apply formal AISP protocols directly to verify work products with mathematical rigor. Use this when you need higher confidence than standard adviser review, or when working on critical system components.

**This workflow differs from standard adviser review:**
- Adviser: Runs AI analysis with formatted output
- Protocol-driven: Applies formal rules from AISP specifications directly

## When to Use

| Scenario | Use Protocol-Driven Verification |
|----------|----------------------------------|
| Safety-critical code | Yes - triangulation + SOLID validation |
| Complex architecture decisions | Yes - formal SOLID + LSP verification |
| High-stakes deployments | Yes - multi-witness confidence scoring |
| Standard feature development | No - regular adviser is sufficient |
| Quick prototypes | No - too rigorous for exploratory work |

## Protocol Verification Modes

### Mode 1: SOLID Compliance Check

**Load:** `{{AGENT_DIR}}/protocols/solid.aisp`

Apply formal SOLID validation to code:

```
1. Identify all Components (classes, modules, functions)
2. For each Component c:
   - validate_SRP(c): |responsibilities(c)|≤1 ∧ |Links(c)|≤7 ∧ cohesion(c)≥0.8
   - validate_OCP(c): ∂𝒩(c)≡∅ ∧ extension_ratio(c)≥0.9
   - validate_DIP(c): abstraction_ratio(c)≥0.9

3. For each subtype relationship (sub, base):
   - validate_LSP(sub,base): Pre(sub)⊇Pre(base) ∧ Post(sub)⊆Post(base)

4. For each client-interface pair (client, interface):
   - validate_ISP(client,interface): utilization(client,interface)≥0.8

5. Aggregate: validate_SOLID(code)≡∧{SRP,OCP,LSP,ISP,DIP}
```

**Report Format:**
```markdown
## SOLID Compliance Report

| Principle | Status | Score | Violations |
|-----------|--------|-------|------------|
| SRP | ✅/⚠️/❌ | 0.XX | [list] |
| OCP | ✅/⚠️/❌ | 0.XX | [list] |
| LSP | ✅/⚠️/❌ | 0.XX | [list] |
| ISP | ✅/⚠️/❌ | 0.XX | [list] |
| DIP | ✅/⚠️/❌ | 0.XX | [list] |

**Overall:** τ≜◊⁺⁺/◊⁺/◊/◊⁻/⊘
```

### Mode 2: Cognitive Triangulation

**Load:** `{{AGENT_DIR}}/protocols/triangulation.aisp`

Apply multi-witness verification for high-confidence assertions:

```
1. Identify Relationship to verify
2. Collect Evidence from multiple witnesses:
   - Deterministic (parser/syntax): score ∈ [0.90, 1.0]
   - Local (same-file analysis): score ∈ [0.40, 0.70]
   - Regional (same-dir analysis): score ∈ [0.40, 0.70]
   - Global (cross-codebase): score ∈ [0.40, 0.70]

3. Calculate Confidence:
   avg = Σ(scores) / n
   variance = Σ(score - avg)² / n
   bonus = max(0, (1 - variance) * 0.2)
   final = min(1.0, avg + bonus)

4. Apply Thresholds:
   - final ≥ 0.50 → Valid assertion
   - variance > 0.4 → Conflict detected
   - final < 0.40 → Escalate for human review
```

**Report Format:**
```markdown
## Triangulation Report

### Assertion: [relationship being verified]

| Witness | Type | Score | Explanation |
|---------|------|-------|-------------|
| Parser | Deterministic | 0.95 | Direct import found |
| LLM-Local | Local | 0.65 | Usage pattern confirmed |
| LLM-Regional | Regional | 0.55 | Sibling module references |

**Aggregate:**
- Average: 0.72
- Variance: 0.04
- Convergence Bonus: +0.19
- **Final Confidence: 0.91** ✅ Valid
```

### Mode 3: YAGNI Necessity Validation

**Load:** `{{AGENT_DIR}}/protocols/yagni.aisp`

Verify that planned features are necessary:

```
1. For each WorkItem w in plan:
   - Check: ∃e∈Evidence: e.target≡w ∧ e.strength > 0.8
   - Evidence sources: UserRequest, BugReport, SystemHealth, BusinessStrategy

2. Classify WorkItems:
   - Required(w) → Implement
   - Speculative(w) → Reject
   - Infrastructure(w) ∧ ¬blocking(w) → Defer

3. Calculate YAGNI compliance:
   compliance = |Required items| / |All items|
```

**Report Format:**
```markdown
## YAGNI Compliance Report

| WorkItem | Classification | Evidence | Decision |
|----------|---------------|----------|----------|
| Feature A | UserFeature | User request PRD-123 | ✅ Implement |
| Feature B | Speculative | "might be useful later" | ❌ Reject |
| Feature C | Infrastructure | Required for A | ✅ Implement |
| Feature D | Speculative | No evidence | ❌ Reject |

**Compliance Score:** 0.XX
**Rejected Items:** N speculative features trimmed
```

### Mode 4: Bayesian Calibration

**Load:** `{{AGENT_DIR}}/protocols/bayesian-calibration.aisp`

Apply information-theoretic calibration to ensure optimal reasoning and order-invariance:

```
1. Estimate Task Complexity (n): (Context Tokens + Semantic Depth)
2. Calculate Optimal CoT Length (k*): 
   k* = c_base * sqrt(n) * log2(1/ε)
3. Execute Permutation Loop (K=20):
   FOR i in [1..20]:
     p_i = permute_context(input)
     votes[i] = evaluate(p_i, protocol)
4. Verify Martingale Property:
   variance = Var(votes)
   IF variance < 0.15: Status ≡ 'Calibrated
   ELSE: Status ≡ 'Uncertain (Increase K)
5. Refine Output:
   Final = BayesianPosterior(votes)
```

**Report Format:**
```markdown
## Bayesian Calibration Report

- **Task Complexity (n):** [value]
- **Thinking Budget (k*):** [value] tokens
- **Permutation Samples (K):** 20
- **Martingale Variance:** 0.XX
- **Calibration Status:** ✅ CALIBRATED / ⚠️ UNCERTAIN

**Verdict:** ⊢Verdict(approve|revise)
```

### Mode 5: Full Protocol Stack

For maximum rigor, apply all protocols in sequence:

```
1. YAGNI Check → Trim speculative items
2. SOLID Validation → Verify architecture quality
3. Triangulation → Multi-witness confidence on key assertions
4. Bayesian Calibration → Ensure optimal scaling and order-invariance
5. Flow Verdict → Final approve/revise/reject decision
```

## The Process

### Step 1: Select Verification Mode

Based on work type:
- Architecture/design → SOLID + YAGNI
- Code implementation → SOLID + Triangulation
- Plan review → YAGNI + Flow
- Critical path → Full Protocol Stack
- High-stakes uncertainty → Bayesian Calibration

### Step 2: Load Required Protocols

```bash
# Example: Load for code verification
cat {{AGENT_DIR}}/protocols/solid.aisp {{AGENT_DIR}}/protocols/triangulation.aisp
```

### Step 3: Apply Protocol Rules

Work through the verification checklist for each mode systematically.

### Step 4: Generate Report

Use the report format templates above. Include:
- Per-item scores
- Aggregate metrics
- Verdict with tier symbol (⊘/◊⁻/◊/◊⁺/◊⁺⁺)

### Step 5: Act on Verdict

From `{{AGENT_DIR}}/protocols/flow.aisp`:
```
Action_From_Verdict≜
  verdict≡reject → escalate (critical issues found)
  verdict≡revise → iterate (address issues, re-verify)
  verdict≡approve → proceed (quality confirmed)
```

## Integration with Adviser

Protocol-driven verification **complements** adviser review:

```
Standard workflow (using dynamic adviser):
  1. Discover protocols: solid.aisp, triangulation.aisp
  2. Compose prompt to ./tmp/adviser-prompt-verify-<uuid>.md
  3. Run: adviser --prompt-file ./tmp/adviser-prompt... --input file.ts --mode aisp

Protocol-enhanced workflow:
  1. Run dynamic adviser (quick AI analysis)
  2. IF verdict≡approve AND is_critical_path:
     - Run protocol-driven-verification for extra rigor (apply rules manually)
  3. IF any protocol check fails:
     - Override adviser verdict to revise/reject
```

## Remember

- **Protocols are formal** - Follow the rules exactly as specified
- **Scores are meaningful** - Don't hand-wave; calculate actual metrics
- **Triangulation prevents hallucination** - Multiple witnesses catch errors
- **YAGNI is ruthless** - If no evidence, reject the feature
- **Trust the formalization** - Protocols encode proven engineering wisdom
