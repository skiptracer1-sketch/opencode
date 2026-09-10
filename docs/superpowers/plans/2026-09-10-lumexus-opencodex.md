# Lumexus OpenCodex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a free-first `opencodex` distribution/launcher to the OpenCode fork for Termux and WSL while preserving upstream OpenCode and requiring approval before Git push.

**Architecture:** Implement a thin package around the existing OpenCode executable. Keep provider discovery/routing, safety policy, launcher behavior, and installers isolated in one package so upstream synchronization stays simple.

**Tech Stack:** TypeScript, Bun, shell installers for Termux/WSL, Bun test, existing OpenCode CLI/configuration interfaces.

**Spec:** `docs/superpowers/specs/2026-09-10-lumexus-opencodex-design.md`

## Global Constraints
- Base on `dev` through the existing feature branch.
- Do not reimplement the OpenCode agent loop.
- Prefer free/local model backends; never silently enable a paid provider.
- Never commit API keys or bearer credentials.
- Require explicit approval before remote Git push.
- Deny force push, branch deletion, credential modification, and destructive repository cleanup by default.
- Support Android/Termux and Windows/WSL without root.

---

### Task 1: Provider discovery and free-first routing
**Files:** Create `packages/opencodex/src/providers.ts`; test `packages/opencodex/test/providers.test.ts`; add package metadata/config as required.

- [ ] Write failing tests for explicit local endpoint priority, Ollama-compatible fallback, optional cloud fallback, and no-provider result.
- [ ] Run the test and confirm failure.
- [ ] Implement deterministic provider discovery using environment/config only; never infer or enable a paid credential.
- [ ] Run tests and require PASS.
- [ ] Commit `feat: add OpenCodex provider routing`.

### Task 2: Git/command safety policy
**Files:** Create `packages/opencodex/src/policy.ts`; test `packages/opencodex/test/policy.test.ts`.

- [ ] Write failing tests proving normal read/edit/test/commit operations are permitted, push returns an approval requirement, and force-push/branch-delete/credential-edit/destructive-clean operations are denied.
- [ ] Run tests and confirm failure.
- [ ] Implement normalized argv-based policy checks without shell-string interpolation.
- [ ] Run tests and require PASS.
- [ ] Commit `feat: add OpenCodex safety policy`.

### Task 3: One-command launcher
**Files:** Create `packages/opencodex/src/index.ts`, `packages/opencodex/bin/opencodex`; test `packages/opencodex/test/launcher.test.ts`.

- [ ] Write failing tests for working-directory preservation, argument forwarding, provider configuration injection, missing OpenCode binary, and exit-code propagation.
- [ ] Run tests and confirm failure.
- [ ] Implement the thin launcher using Bun process APIs and an argv array; delegate the agent loop to OpenCode.
- [ ] Run tests and require PASS.
- [ ] Commit `feat: add OpenCodex launcher`.

### Task 4: Termux and WSL installers
**Files:** Create `packages/opencodex/install/termux.sh`, `packages/opencodex/install/wsl.sh`; test `packages/opencodex/test/installers.test.ts`.

- [ ] Write tests/static assertions proving installers avoid root, verify prerequisites, install/link the launcher, and never embed credentials.
- [ ] Implement idempotent installers with clear failure messages.
- [ ] Run installer tests and require PASS.
- [ ] Commit `feat: add OpenCodex installers`.

### Task 5: Operator configuration and docs
**Files:** Create `packages/opencodex/README.md`, `packages/opencodex/.env.example`, and repository-safe default configuration.

- [ ] Document Termux and WSL installation, local endpoint/Ollama configuration, optional cloud fallback, Git approval behavior, troubleshooting, and uninstall.
- [ ] Ensure `.env.example` contains placeholders only.
- [ ] Run a secret-pattern scan over the new package.
- [ ] Commit `docs: add OpenCodex setup guide`.

### Task 6: End-to-end verification
- [ ] From an isolated clean worktree, install dependencies and run all `packages/opencodex` tests.
- [ ] Run repository formatting/lint/type checks covering the package.
- [ ] Use fake `opencode` and provider executables to verify free-provider selection and exact argument forwarding.
- [ ] Verify `git push` is approval-gated and `git push --force` is denied in policy tests.
- [ ] Verify no secrets exist in `dev...lumexus-mcp-bridge` diff.
- [ ] Open a PR to `dev` only after all required checks pass; do not claim runtime verification without the actual command output.