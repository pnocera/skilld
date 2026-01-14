# Phone-Advisor Implementation Plan v2

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a feedback-loop skill that calls the user on their phone using Vapi.ai and waits for verbal feedback to continue a workflow.

**Architecture:** A local Bun-based webhook listener (Bridge) and a CLI tool (Caller). The Bridge manages state in SQLite and receives call results via HMAC-secured webhooks.

**Tech Stack:** Bun, SQLite, Vapi SDK (@vapi-ai/server-sdk), HMAC-SHA256.

**Adviser Review:** Iteration 4 (AISP Hardened).

---

## Phase 1: Environment & Bridge Foundation

**Task 1: Project Initialization**
- Create directory structure: `skills/phone-advisor/src`, `skills/phone-advisor/db`.
- Initialize `package.json` with dependencies: `zod`, `sqlite`, `@vapi-ai/server-sdk`, `crypto`.
- Create `.env.example` with `VAPI_API_KEY` and `VAPI_WEBHOOK_SECRET`.

**Task 2: State Management (db.ts)**
- Define SQLite schema in `db/schema.sql`:
    - `calls` table: `cid` (UUID, PK), `context` (TEXT), `status` (PENDING/COMPLETED/EXPIRED), `result` (JSON), `created_at`, `updated_at`.
    - `nonces` table: `id` (TEXT, PK), `created_at`.
- Implement `db.ts`:
    - `initDb()`: Run schema and enable WAL mode (`PRAGMA journal_mode = WAL`).
    - `createCall(cid, context)`: Transactional insert.
    - `resolveCall(cid, result)`: `BEGIN IMMEDIATE TRANSACTION` to mark as COMPLETED and save JSON.
    - `isValidNonce(id)`: Atomic check-and-save for idempotency.
- **Verification**: Write `db.test.ts` to verify `BEGIN IMMEDIATE` prevents concurrent write issues.

**Task 3: Webhook Listener (bridge.ts)**
- Implement `Bun.serve` on port 3001 (configurable).
- Implement `verifyVapiSignature(req)`:
    - Extract `x-vapi-signature` and `x-vapi-timestamp`.
    - Verify timestamp is within `±120s`.
    - Compute HMAC-SHA256 of `timestamp + "." + body` using `VAPI_WEBHOOK_SECRET`.
- POST handler for `/webhook/vapi`:
    - Verify signature and nonce (`message_id`).
    - If valid: `resolveCall(cid, body.analysis)` and write result to `.agent/runs/<cid>.json`.
- **Verification**: Use `curl` to send a signed vs. unsigned payload.

## Phase 2: CLI Caller & Vapi Integration

**Task 4: The Caller (index.ts)**
- Implement CLI: `phone-advisor call --phone <number> --context <text> --success <criteria>`.
- Logic:
    - Generate `crypto.randomUUID()`.
    - Create `calls` entry in DB.
    - Initialize Vapi client and trigger `vapi.calls.create()`.
    - Enter **Polling Loop**: Check `.agent/runs/<cid>.json` every 2s for 240 attempts (8 mins total).
- On Exit: Output JSON result to stdout; delete temp run file.

**Task 5: Refactor Deployer for Multi-Skill Support**
- Modify `deploy-skill.ts` to accept a skill name as an argument.
- Ensure it can deploy `adviser` or `phone-advisor` individually.
- Update `package.json` scripts: `deploy:adviser` and `deploy:phone-advisor`.

## Phase 3: Workflow Integration

**Task 6: Brainstorming Checkpoint Update**
- Update `workflows/brainstorm.md` around line 55 (Escalation).
- Add step: "IF adviser loop fails, offer `phone-advisor call` as a priority checkpoint."

---

## Verification Plan
1. **Security Test**: Trigger webhook with invalid HMAC -> Expect 401.
2. **Replay Test**: Trigger webhook with old timestamp -> Expect 401.
3. **End-to-End**: Run `phone-advisor call`, answer phone, speak, verify workflow proceeds.
