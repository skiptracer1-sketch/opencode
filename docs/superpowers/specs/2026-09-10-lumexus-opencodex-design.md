# Lumexus OpenCodex Design

## Goal
Create a free-first coding-agent distribution on top of the existing OpenCode fork, optimized for Android/Termux and Windows/WSL, with interchangeable local/cloud models and approval required before remote Git pushes.

## Product boundary
Lumexus OpenCodex is a distribution/configuration layer around OpenCode, not a replacement IDE or model runtime. It remains upstream-compatible and keeps Lumexus-specific behavior isolated.

## User flow
The user runs `opencodex` inside a Git repository or supplies a repository path. OpenCodex discovers available model backends, prefers a configured free/local backend, starts OpenCode with Lumexus defaults, permits normal local code editing/build/test loops, and stops before remote push unless the user explicitly approves it.

## Model routing
Provider priority is configurable. The default free-first order is: explicitly configured local OpenAI-compatible endpoint, Ollama-compatible local endpoint, then optional user-configured cloud provider. No paid provider is silently enabled and no API key is committed to the repository.

## Platforms
v1 supports Android through Termux and Windows through WSL. Install scripts verify required commands and print actionable failures. The scripts do not request root access.

## Git safety
Local edits, tests, diffs, branches, and commits are permitted according to OpenCode's normal permission model. Remote push is approval-gated. Force push, branch deletion, credential modification, and destructive repository cleanup are denied by the Lumexus defaults.

## Configuration
User configuration lives outside the repository when it contains secrets. Repository-safe defaults define model priority, command policy, Git safety rules, and UI/product naming. Environment variables may select endpoints/models without embedding credentials.

## Launcher
`opencodex` is a thin launcher that validates the environment, resolves the preferred free model backend, loads Lumexus configuration, and delegates to the upstream OpenCode executable. It must not fork/reimplement OpenCode's agent loop.

## Testing
Automated tests cover provider selection, missing-provider behavior, Git push gating, unsafe command denial, path handling, and launcher argument forwarding. Tests use fake executables/endpoints and require no paid model credentials.

## Non-goals
No custom IDE, proprietary model runtime, root/device control, credential harvesting, silent paid API use, autonomous production deployment, or unrestricted remote shell.

## Success criteria
A fresh supported environment can install and launch `opencodex`; a free/local provider is selected when available; a repository can be edited and tested; unsafe Git operations are denied; and a remote push cannot occur without explicit user approval.