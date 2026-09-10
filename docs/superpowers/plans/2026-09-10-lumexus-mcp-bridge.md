# Lumexus MCP Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure MCP-facing sidecar that lets authenticated clients run narrowly scoped OpenCode tasks against allowlisted repositories.

**Architecture:** Add a focused bridge package that owns MCP transport, authentication/policy, workspace validation, OpenCode process execution, verification profiles, and audit events. Keep it isolated from OpenCode core APIs so upstream `dev` can be synchronized with minimal conflicts.

**Tech Stack:** TypeScript, Bun, MCP SDK already compatible with the repository dependency strategy, Bun test, child-process execution through Bun APIs.

**Spec:** `docs/superpowers/specs/2026-09-10-lumexus-mcp-bridge-design.md`

## Global Constraints

- Base work on `dev`; do not assume a local `main` ref.
- Use Bun APIs when possible.
- Do not use `any`, unnecessary import aliases, or star imports.
- No unrestricted remote shell.
- Fail closed when authentication or required security configuration is absent.
- Never log bearer tokens or provider secrets.
- Repositories and filesystem paths must be allowlisted and normalized before execution.
- Client requests select named execution/verification profiles; clients cannot submit raw shell commands.

---

### Task 1: Bridge configuration and policy boundary

**Files:**
- Create: `packages/lumexus-mcp/package.json`
- Create: `packages/lumexus-mcp/tsconfig.json`
- Create: `packages/lumexus-mcp/src/config.ts`
- Create: `packages/lumexus-mcp/src/policy.ts`
- Test: `packages/lumexus-mcp/test/policy.test.ts`

**Interfaces:**
- Produces: `loadConfig(env)` containing workspace root, token, OpenCode binary, repository allowlist, time/output limits, and named profiles.
- Produces: `resolveRepository(config, repo)` and `resolveRepoPath(config, repo, relativePath)` which return validated paths or throw policy errors.

- [ ] Write failing Bun tests proving missing auth config fails closed, unknown repositories are rejected, `..` traversal is rejected, absolute paths are rejected, and known repositories resolve below the configured workspace root.
- [ ] Run `bun test packages/lumexus-mcp/test/policy.test.ts` and verify failure because the config/policy modules do not exist.
- [ ] Implement environment parsing with exact required keys `LUMEXUS_MCP_TOKEN`, `LUMEXUS_WORKSPACE_ROOT`, `LUMEXUS_ALLOWED_REPOS`; optional `LUMEXUS_OPENCODE_BIN` defaults to `opencode`, timeout defaults to 300000 ms, and output limit defaults to 1048576 bytes.
- [ ] Implement repository/path resolution using normalized paths and a containment check against the approved repository root.
- [ ] Run the policy tests and verify PASS.
- [ ] Commit with `feat: add MCP bridge policy boundary`.

### Task 2: Authentication and redacted audit events

**Files:**
- Create: `packages/lumexus-mcp/src/auth.ts`
- Create: `packages/lumexus-mcp/src/audit.ts`
- Test: `packages/lumexus-mcp/test/auth-audit.test.ts`

**Interfaces:**
- Consumes: configuration token from Task 1.
- Produces: `authenticateAuthorization(config, header)` returning an authenticated principal or throwing `unauthenticated`.
- Produces: `audit(event, sink)` with event fields `requestId`, `timestamp`, `principal`, `action`, `repo`, `decision`, `durationMs`, `result`.

- [ ] Write failing tests for missing/malformed/wrong bearer credentials, valid credentials, and recursive redaction of fields whose keys contain `token`, `secret`, `authorization`, or `api_key` case-insensitively.
- [ ] Run `bun test packages/lumexus-mcp/test/auth-audit.test.ts` and verify failure.
- [ ] Implement bearer parsing and timing-safe credential comparison using byte arrays of equal length before comparison.
- [ ] Implement newline-delimited JSON audit output with recursive secret-key redaction and no raw environment dump.
- [ ] Run the tests and verify PASS.
- [ ] Commit with `feat: add bridge authentication and audit`.

### Task 3: Bounded OpenCode execution adapter

**Files:**
- Create: `packages/lumexus-mcp/src/executor.ts`
- Test: `packages/lumexus-mcp/test/executor.test.ts`
- Create: `packages/lumexus-mcp/test/fixtures/fake-opencode.ts`

**Interfaces:**
- Consumes: validated repository root from Task 1.
- Produces: `runOpenCode(config, request)` returning `{ exitCode, stdout, stderr, durationMs, timedOut, truncated }`.
- Request fields: `repo`, `instruction`, `profile` where profile is a configured name, never a shell string.

- [ ] Write failing tests showing execution uses the approved working directory, unknown profiles are rejected before spawn, timeout terminates execution, and stdout/stderr are capped at the configured output limit.
- [ ] Run `bun test packages/lumexus-mcp/test/executor.test.ts` and verify failure.
- [ ] Implement execution with `Bun.spawn`, an explicit argument array, approved cwd, minimal environment, timeout cancellation, and bounded output capture.
- [ ] Ensure the instruction is passed as an argument/stdin according to the OpenCode CLI contract rather than interpolated into a shell command.
- [ ] Run executor tests and verify PASS.
- [ ] Commit with `feat: add bounded OpenCode executor`.

### Task 4: Read-only repository tools and verification profiles

**Files:**
- Create: `packages/lumexus-mcp/src/repository.ts`
- Create: `packages/lumexus-mcp/src/verify.ts`
- Test: `packages/lumexus-mcp/test/repository.test.ts`
- Test: `packages/lumexus-mcp/test/verify.test.ts`

**Interfaces:**
- Produces: `inspectRepository(config, repo)`, `readRepositoryFile(config, repo, path)`, and `runVerification(config, repo, profile)`.

- [ ] Write failing tests for bounded UTF-8 reads, missing files, traversal rejection, repository metadata, known verification profiles, and rejection of raw/unknown commands.
- [ ] Run the two test files and verify failure.
- [ ] Implement reads with `Bun.file` after policy resolution and cap read size to the configured output limit.
- [ ] Implement verification by looking up a static configured argv profile and spawning it without a shell in the approved cwd.
- [ ] Run tests and verify PASS.
- [ ] Commit with `feat: add repository verification tools`.

### Task 5: MCP server and tool contract

**Files:**
- Create: `packages/lumexus-mcp/src/server.ts`
- Create: `packages/lumexus-mcp/src/index.ts`
- Test: `packages/lumexus-mcp/test/server.test.ts`

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces MCP tools `lumexus_status`, `repo_inspect`, `repo_read`, `opencode_run`, `repo_verify`.

- [ ] Write failing integration tests that initialize the server, discover exactly the v1 tool set, reject an unauthenticated request, perform one authenticated `lumexus_status`, and perform one fixture-backed `repo_read`.
- [ ] Run `bun test packages/lumexus-mcp/test/server.test.ts` and verify failure.
- [ ] Implement the MCP transport using the repository-compatible MCP SDK. Authenticate before dispatch and validate tool inputs before policy/execution calls.
- [ ] Map internal errors to stable categories `unauthenticated`, `forbidden`, `invalid_request`, `not_found`, `timeout`, `execution_failed`, `internal` without leaking secrets or external filesystem paths.
- [ ] Emit one redacted audit event for every accepted or rejected tool request.
- [ ] Run server tests and verify PASS.
- [ ] Commit with `feat: expose Lumexus MCP bridge tools`.

### Task 6: Deployment and operator documentation

**Files:**
- Create: `packages/lumexus-mcp/README.md`
- Create: `packages/lumexus-mcp/.env.example`
- Create: `packages/lumexus-mcp/Dockerfile`
- Test: existing package tests plus package typecheck/build command.

**Interfaces:**
- Documents HTTPS reverse-proxy/platform ingress requirement and secret injection without embedding credentials.

- [ ] Add `.env.example` containing placeholder values only and a sample allowlist/profile configuration.
- [ ] Add a non-root production container image that installs dependencies, exposes only the bridge port, and starts the bridge entrypoint.
- [ ] Document local Bun startup, fake/test startup, production TLS topology, token rotation, allowlist changes, audit destination, and the explicit v1 non-goals.
- [ ] Run `bun test packages/lumexus-mcp/test` and the package typecheck/build command; require all to pass.
- [ ] Inspect the git diff for committed credentials, unrestricted shell invocation, force-push/deployment functionality, or paths escaping `packages/lumexus-mcp`; fix any finding.
- [ ] Commit with `docs: add MCP bridge deployment guide`.

### Task 7: Final verification and PR

**Files:**
- Modify only files required by failures discovered during verification.

- [ ] Run the complete bridge test suite from a clean checkout/worktree.
- [ ] Run repository-required formatting/lint/type checks that cover the new package.
- [ ] Verify a fake OpenCode integration request succeeds in an allowlisted fixture repo and fails in a non-allowlisted repo.
- [ ] Verify logs contain no configured bearer token using an exact-string scan of captured test/audit output.
- [ ] Compare `dev...lumexus-mcp-bridge` and confirm the change remains isolated to the bridge package and its design/plan documentation except for any required workspace registration.
- [ ] Open a PR titled `feat: add Lumexus MCP bridge` targeting `dev`, summarize the trust boundary and test evidence, and do not merge until CI/review is clean.