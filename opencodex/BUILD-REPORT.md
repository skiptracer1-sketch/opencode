# OpenCodex 1.18.30-opencodex.2

Source base: `skiptracer1-sketch/opencode`, commit `193de13a88d62a6409c6d385831180f1def527dc`.

Runtime-verified source: `211f8e08c05f5768667c5ef3576883d6b19e4059`. All three jobs in [GitHub Actions run 34544265431](https://github.com/skiptracer1-sketch/opencode/actions/runs/34544265431) passed: compilation, Linux verification, and Windows verification.

## Revision 2

The Windows browser check found a directory-picker bug: the server found a folder, but the UI filtered it out when the typed path used forward slashes and the displayed path used backslashes. Revision 2 includes both path forms in the search terms. The Windows runtime check now pastes a forward-slash path and successfully selects the matching native Windows directory.

## Passed

- Frozen-lockfile dependency installation, using Bun 1.3.14.
- `bun test test/cli/opencodex.test.ts`: 4 tests passed, 17 assertions, no failures.
- `bun typecheck` in `packages/opencode`: exit 0 in the original build. Revision 2's product-code change is in the browser picker.
- `bun typecheck` in `packages/app`: exit 0, rerun after the directory-picker fix.
- Production web UI compilation, embedded inside both executables.
- Linux x64 and Windows x64 compilation: exit 0.
- Native Linux and Windows `opencodex --version`: `1.18.30-opencodex.2`.
- Native Linux and Windows `opencodex --help`: correct OpenCodex launch commands.
- Native execution on GitHub-hosted Linux x64 (`ubuntu-24.04`) and Windows x64 (`windows-2025`) hosts, without installing the development workspace's dependencies on either test host.
- The server started on loopback on both systems. Missing and incorrect passwords were rejected with HTTP 401. Correct credentials allowed health and project-path requests.
- The embedded OpenCodex interface loaded in Chromium on both systems. The desktop interface rendered at 1365 × 900, and the project picker found and added the synthetic project.
- Both browser interfaces rendered at a 390 × 844 mobile viewport. No uncaught browser page errors were recorded.
- `git diff --check`: no whitespace errors.

Each distribution includes `RUNTIME-REPORT.json`, which records the tested commit, workflow, checks, and executable SHA-256. The downloaded executable bytes were independently compared with that hash before packaging. Browser screenshots are included in `verification/`.

The CI checks use a temporary synthetic project, disable model providers and plugins, and redact the generated test password from retained logs.

## Earlier live model checks (revision 1)

After explicit user authorization, the compiled Linux executable connected to `opencode/big-pickle`. Two live runs exited with code 0, read the synthetic README, and wrote `greeting.txt`. Independent filesystem inspection confirmed that the written text matched the model's tool arguments. No business repositories or provider credentials were supplied.

The strict file-content check **did not pass**. The task requested `OpenCodex verification passed.` followed by a final LF newline. Big Pickle supplied the text without that newline in both the initial run and a focused correction request. Tool-call logs show the newline was already absent from the arguments supplied by the model; the file writer preserved those arguments. The model's claim that the newline was present was not accepted as verification.

A diagnostic attempt using `opencode/minimax-m2.5-free` returned `Unexpected server error. Check server logs for details.` and exited with code 1 before a successful tool call. That model was not verified.

Those earlier live checks demonstrate model connectivity and file creation, with an unresolved exact-formatting failure for the tested Big Pickle model. They do not establish reliable task completion for every free model. Revision 2's CI checks cover native execution and browser operation, not live model inference.

## Not verified

- Operation on the user's specific Windows 11 laptop and automatic browser opening when double-clicking `Start-OpenCodex.cmd`. CI launched the executable's `serve` command and opened its browser interface through automation.
- Local Ollama inference: no model server or weights were installed in this environment. Local-mode configuration is covered by the launcher tests.
- Successful model-driven coding tasks through every provider or through the browser UI.

## Build notes

Both executables were compiled on Linux and then executed on their respective operating systems. The original local environment prohibited server/browser socket operations; GitHub-hosted runners supplied the native runtime evidence above.

The dependency installation initially failed during native Node header extraction. Supplying the matching Node headers without ownership changes allowed installation to finish without source or lockfile changes. All required native target dependencies were installed before cross compilation.

The production web build reports existing large JavaScript chunks. This distribution retains the upstream application architecture. No provider credentials, user sessions, model weights, or test-state data are included in the archives.

Review generated changes and run project checks before relying on model output. These artifacts are portable development builds, not signed installers.
