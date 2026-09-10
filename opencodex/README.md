# OpenCodex

An independently built distribution of [OpenCode](https://github.com/anomalyco/opencode), from [your fork](https://github.com/skiptracer1-sketch/opencode). The agent, file editing, terminal tools, model connections, sessions, MCP support, and embedded browser workspace come from OpenCode. Upstream MIT license and attribution are retained. OpenCodex is not an official OpenAI product.

## Start

Extract the complete archive first.

- **Windows x64:** double-click `Start-OpenCodex.cmd`.
- **Linux x64:** run `./start-opencodex.sh`.

The browser opens on `http://127.0.0.1:4096`. Enter the username and random password printed in the launcher window. Keep that window open while you work. Choose **Open project**, select a folder, connect a model, and enter your coding task. Work runs on the computer hosting OpenCodex.

OpenCodex itself has no subscription fee. Model providers have their own prices and usage limits. Existing provider credentials remain in OpenCode's local credential store and are never bundled in this distribution.

## Models

- **Local inference:** install and start [Ollama](https://ollama.com), pull a tool-capable model that fits your computer, then run `opencodex local MODEL_NAME`. This launch enables only Ollama, so it cannot fall back to a paid cloud provider. Model weights are a separate download; none are bundled. Available RAM and context size affect performance.
- **Free hosted models:** select a model explicitly marked free in the model picker. Availability and limits are controlled by its provider.
- **Existing ChatGPT plan:** the inherited OpenAI connection offers ChatGPT sign-in. Authenticate in the app; this build does not sign in to your account for you or remove provider limits. See [OpenCode provider instructions](https://opencode.ai/docs/providers/#openai).
- **API providers:** connect using the existing provider dialog; provider billing applies.

## Commands

```text
opencodex                       Open the browser workspace
opencodex tui                   Open the terminal interface
opencodex tui /path/to/project   Open a project in the terminal
opencodex local MODEL_NAME      Use an installed Ollama model
opencodex run "explain this repo"
opencodex serve --port 4096
opencodex --help
```

On Windows, use `.\opencodex.exe` from PowerShell. On Linux, use `./opencodex` when the folder is not on PATH. Git is needed for repository operations. Some language tools and MCP integrations require their own runtimes.

## Access and updates

The default server listens only on this computer. Web/server launches require a generated password unless you supply `OPENCODE_SERVER_PASSWORD`; the default username is `opencodex`. For a phone connection, use a trusted private network or VPN and explicitly set the hostname and credentials. Plain HTTP does not encrypt network traffic; use HTTPS through a reverse proxy or an encrypted tunnel for remote access.

OpenCodex disables automatic upstream binary replacement. Replace the extracted folder with a new OpenCodex build to update. The upstream config names and data directories stay compatible with OpenCode. Removing the portable folder does not erase your sessions or credentials.

This is a separate application. It does not replace ChatGPT's internal tools or install itself inside the ChatGPT Android app.

## Build from source

From the repository root, with Bun 1.3.14 or a compatible newer version:

```sh
bun install --frozen-lockfile
OPENCODE_VERSION=1.18.30-opencodex.1 bun run packages/opencode/script/build.ts --single --opencodex --skip-install
```

The executable is under `packages/opencode/dist/opencode-<platform>/bin/`. Copy it beside the matching launcher and this README. Keep the upstream `LICENSE` with the distribution.

To select another supported target, omit `--single` and use `--target=windows-x64` or `--target=linux-x64`. Cross builds require the native dependencies for that platform; use the existing build script's install step when those are missing. The web interface is embedded by default.

## Verification

Run focused launcher tests from `packages/opencode`:

```sh
bun test test/cli/opencodex.test.ts
bun typecheck
```

The build script also runs `--version` for native targets. Cross compilation alone does not verify Windows runtime behavior. Consult the included build report for the exact checks performed on this release.

The `OpenCodex native verification` GitHub Actions workflow builds on Windows and Linux hosts, checks password protection, loads the embedded UI in Chromium, and opens a synthetic project through the directory picker. It saves screenshots and a runtime report; a distribution artifact is uploaded only after those checks pass. No model inference or provider credentials are used. The browser test covers the served workspace, not the operating system's double-click browser launch.

To run the same check after a native build, install `agent-browser@0.37.1` and its browser (`agent-browser install`), then run from `packages/opencode`:

```sh
bun run ../../opencodex/verify-runtime.ts
```

Evidence is written to `opencodex/verification/`. When a CI distribution includes `RUNTIME-REPORT.json`, its SHA-256 identifies the executable that was tested.
