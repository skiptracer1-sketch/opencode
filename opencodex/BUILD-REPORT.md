# OpenCodex 1.18.30-opencodex.1

Source base: `skiptracer1-sketch/opencode`, commit `193de13a88d62a6409c6d385831180f1def527dc`.

## Passed

- Frozen-lockfile dependency installation, using Bun 1.3.14.
- `bun test test/cli/opencodex.test.ts`: 4 tests passed, 17 assertions, no failures.
- `bun typecheck` in `packages/opencode`: exit 0.
- `bun typecheck` in `packages/app`: exit 0.
- Production web UI compilation, embedded inside both executables.
- Linux x64 and Windows x64 compilation: exit 0.
- Native Linux `opencodex --version`: `1.18.30-opencodex.1`.
- Native Linux `opencodex --help`: correct OpenCodex launch commands.
- `git diff --check`: no whitespace errors.
- Live connection to `opencode/big-pickle`, after explicit user authorization: the compiled Linux executable received real model responses and completed two runs with exit code 0.
- Live file-tool operation: the model read the synthetic README and wrote `greeting.txt`. Independent filesystem inspection confirmed the written text matches the model's tool arguments. No business repositories or provider credentials were supplied.

## Live test findings

The strict file-content check **did not pass**. The task requested `OpenCodex verification passed.` followed by a final LF newline. Big Pickle supplied the text without that newline in both the initial run and a focused correction request. Tool-call logs show the newline was already absent from the arguments supplied by the model; the file writer preserved those arguments. The model's claim that the newline was present was not accepted as verification.

A diagnostic attempt using `opencode/minimax-m2.5-free` returned `Unexpected server error. Check server logs for details.` and exited with code 1 before a successful tool call. That model was not verified.

The live checks therefore demonstrate model connectivity and file creation, with an unresolved exact-formatting failure for the tested Big Pickle model. They do not establish reliable task completion for every free model. Provider availability and model output quality need independent checking during normal use.

## Not verified

- Windows execution: cross-compiled on Linux; no Windows host was available.
- Server startup and browser interaction: the execution environment prohibits required socket operations and does not permit a sandbox exception. Browser launch failed with `socket() failed: Operation not permitted`.
- Local Ollama inference: no model server or weights were installed in this environment. Local-mode configuration is covered by the launcher tests.

## Build notes

The dependency installation initially failed during native Node header extraction. Supplying the matching Node headers without ownership changes allowed installation to finish without source or lockfile changes. All required native target dependencies were installed before cross compilation.

The production web build reports existing large JavaScript chunks. This distribution retains the upstream application architecture. No provider credentials, user sessions, model weights, or test-state data are included in the archives.

Launch OpenCodex on the target computer to complete the remaining platform and browser validation. Review generated changes and run project checks before relying on model output. These artifacts are development builds, not signed installers.
