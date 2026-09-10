# Lumexus MCP Bridge Design

## Goal
Provide a secure, auditable MCP-facing execution boundary that allows an authorized ChatGPT/Codex client to request narrowly scoped OpenCode work against explicitly approved GitHub repositories without exposing an unrestricted shell.

## Architecture

ChatGPT/Codex -> HTTPS MCP endpoint -> authentication -> policy engine -> workspace/OpenCode adapter -> approved repository workspace -> result/audit event.

The bridge is a thin sidecar/package rather than a deep fork of OpenCode. This minimizes upstream merge friction and keeps Lumexus-specific trust policy isolated from OpenCode core behavior.

## Components

### MCP transport
Expose an HTTPS MCP-compatible service with health/status and a small tool surface. Initial operations are repository inspection, file reading, change proposal/execution, approved test/build execution, and result reporting. The bridge does not expose arbitrary shell execution.

### Authentication
Require a bearer credential supplied through runtime environment/secret management. Never commit credentials. Compare credentials safely and reject missing or invalid authentication before tool dispatch.

### Policy engine
Enforce an explicit repository allowlist and normalized workspace paths. Reject traversal and repositories outside the allowlist. Commands are selected from configured command profiles rather than raw client-provided shell strings. Deny destructive Git/filesystem/system operations by default.

### OpenCode adapter
Translate an approved request into an OpenCode invocation within a dedicated repository workspace. Capture stdout, stderr, exit status, elapsed time, and timeout state. Environment inheritance is minimized so secrets unrelated to the requested operation are not forwarded.

### Execution isolation
Production execution runs on controlled infrastructure, not a publicly exposed Android handset. Each job receives a bounded workspace, timeout, output limit, and policy context. A later hardening phase may move jobs into disposable containers without changing the MCP interface.

### Audit
Record request ID, timestamp, authenticated principal identifier, tool/action, repository, policy decision, execution result, duration, and non-secret error metadata. Never record bearer tokens or provider secrets.

## Initial Tool Contract

- `lumexus_status()` -> bridge/version/policy status with no secrets.
- `repo_inspect(repo)` -> approved repository metadata/status.
- `repo_read(repo, path)` -> bounded UTF-8 file read after path validation.
- `opencode_run(repo, instruction, profile)` -> execute OpenCode with an approved profile in the repository workspace and return a structured result.
- `repo_verify(repo, profile)` -> run a configured verification profile such as tests/typecheck/build; the client cannot provide a raw shell command.

Mutating work is limited to the selected workspace. Remote pushes, force operations, branch deletion, secret changes, and deployment are not part of the initial tool contract.

## Configuration

Runtime configuration supplies bind host/port, bearer-token secret reference, workspace root, allowed repositories, OpenCode executable path, maximum execution time, maximum captured output, and named verification profiles. Startup fails closed when required security configuration is absent.

## Error Handling

Return structured errors with stable categories: unauthenticated, forbidden, invalid_request, not_found, timeout, execution_failed, and internal. External errors must not reveal tokens, arbitrary environment values, or filesystem paths outside the configured workspace root.

## Testing

Unit tests cover authentication, allowlist decisions, traversal rejection, command-profile rejection, output limits, timeout behavior, and audit redaction. Integration tests use a temporary fixture repository and a fake OpenCode executable so CI does not require external model credentials. A final smoke test verifies MCP initialization/tool discovery and one read-only operation.

## Deployment

Deploy the bridge behind HTTPS on controlled infrastructure. Bind the application service to loopback/private networking where a reverse proxy or platform ingress terminates TLS. Keep Android/Termux as an optional development client/node rather than an internet-facing production endpoint.

## Non-goals for v1

No unrestricted remote shell, autonomous deployment, root/device control, GitHub secret administration, force push, arbitrary network proxying, or public unauthenticated endpoint.

## Success Criteria

An authenticated MCP client can discover the bridge tools and execute an OpenCode task only in an allowlisted repository. Unauthorized repositories, traversal attempts, unknown execution profiles, and invalid credentials are rejected before execution. Every accepted/rejected request produces a redacted audit event, and the automated security/integration tests pass.