#!/usr/bin/env bun

import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const target = process.platform === "win32" ? "windows-x64" : "linux-x64"
assert(
  ["win32", "linux"].includes(process.platform) && process.arch === "x64",
  "An x64 Windows or Linux host is required",
)
const binary = path.join(
  root,
  "packages/opencode/dist",
  `opencode-${target}`,
  "bin",
  process.platform === "win32" ? "opencodex.exe" : "opencodex",
)
const output = path.join(import.meta.dirname, "verification")
const temporary = await mkdtemp(path.join(os.tmpdir(), "opencodex-runtime-"))
const project = path.join(temporary, "sample-project")
await mkdir(project)
await mkdir(output, { recursive: true })
await Bun.write(
  path.join(project, "README.md"),
  "# OpenCodex runtime verification\n\nSynthetic project. No model calls are needed.\n",
)

const password = randomUUID()
const authorization = `Basic ${Buffer.from(`opencodex:${password}`).toString("base64")}`
const env = {
  ...process.env,
  OPENCODE_SERVER_USERNAME: "opencodex",
  OPENCODE_SERVER_PASSWORD: password,
  OPENCODE_CONFIG_CONTENT: JSON.stringify({ enabled_providers: [], plugin: [], share: "disabled" }),
  OPENCODE_CONFIG: undefined,
  OPENCODE_CONFIG_DIR: undefined,
  OPENCODE_DISABLE_MODELS_FETCH: "1",
  OPENCODE_DISABLE_DEFAULT_PLUGINS: "1",
  OPENCODE_PURE: "1",
  XDG_CONFIG_HOME: path.join(temporary, "config"),
  XDG_DATA_HOME: path.join(temporary, "data"),
  XDG_CACHE_HOME: path.join(temporary, "cache"),
  XDG_STATE_HOME: path.join(temporary, "state"),
}
const checks: string[] = []
const browserLog: unknown[] = []
const browserSession = `opencodex-${randomUUID()}`
const serverLog: string[] = []
const state: { server?: ReturnType<typeof Bun.spawn>; browser: boolean; error?: string } = { browser: false }
const redact = (value: string) => value.replaceAll(password, "[REDACTED]").replaceAll(authorization, "[REDACTED]")

async function browser(args: string[]) {
  state.browser = true
  const child = Bun.spawn(
    ["agent-browser", "--session", browserSession, "--allowed-domains", "127.0.0.1", "--json", ...args],
    {
      cwd: project,
      stdout: "pipe",
      stderr: "pipe",
    },
  )
  const timeout = setTimeout(() => child.kill(), 45_000)
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  clearTimeout(timeout)
  assert(stdout.trim(), `Browser command ${args[0]} returned no result: ${redact(stderr)}`)
  const result = JSON.parse(stdout)
  browserLog.push({ command: args[0], response: JSON.parse(redact(JSON.stringify(result))), stderr: redact(stderr) })
  assert.equal(code, 0, `Browser command ${args[0]} failed: ${redact(stderr || stdout)}`)
  assert.equal(result.success, true, `Browser command ${args[0]} failed: ${redact(stdout)}`)
  return result.data
}

function passed(name: string) {
  checks.push(name)
  console.log(`PASS ${name}`)
}

try {
  for (const args of [["--version"], ["--help"]]) {
    const child = Bun.spawn([binary, ...args], { cwd: project, env, stdout: "pipe", stderr: "pipe" })
    const timeout = setTimeout(() => child.kill(), 30_000)
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    clearTimeout(timeout)
    assert.equal(code, 0, redact(stderr))
    assert.match(stdout, args[0] === "--version" ? /1\.18\.30-opencodex\.1/ : /OpenCodex/)
    passed(`native ${args[0]}`)
  }

  // OpenCode tries its default port first, then asks the OS for a free port.
  state.server = Bun.spawn([binary, "serve", "--hostname", "127.0.0.1", "--port", "0"], {
    cwd: project,
    env,
    stdout: "pipe",
    stderr: "pipe",
  })
  const capture = async (stream: ReadableStream<Uint8Array>) => {
    for await (const chunk of stream) serverLog.push(Buffer.from(chunk).toString("utf8"))
  }
  const captureLogs = Promise.all([
    capture(state.server.stdout as ReadableStream<Uint8Array>),
    capture(state.server.stderr as ReadableStream<Uint8Array>),
  ])
  const deadline = Date.now() + 60_000
  while (!serverLog.join("").match(/server listening on (http:\/\/127\.0\.0\.1:\d+)/)) {
    assert.equal(state.server.exitCode, null, `Server exited before readiness: ${redact(serverLog.join(""))}`)
    assert(Date.now() < deadline, `Server startup timed out: ${redact(serverLog.join(""))}`)
    await Bun.sleep(100)
  }
  const origin = serverLog.join("").match(/server listening on (http:\/\/127\.0\.0\.1:\d+)/)![1]
  passed("native server startup on loopback")
  const request = (route: string, auth?: string) =>
    fetch(`${origin}${route}`, {
      headers: { ...(auth ? { authorization: auth } : {}), "x-opencode-directory": project },
      signal: AbortSignal.timeout(30_000),
    })
  for (const auth of [undefined, `Basic ${Buffer.from("opencodex:incorrect-password").toString("base64")}`]) {
    const response = await request("/path", auth)
    await response.arrayBuffer()
    assert.equal(response.status, 401, "An unauthenticated client must not access project paths")
  }
  passed("missing and incorrect passwords rejected")
  const health = await request("/global/health", authorization)
  assert.equal(health.status, 200)
  assert.equal((await health.json()).healthy, true)
  const paths = await request("/path", authorization)
  assert.equal(paths.status, 200)
  const actualDirectory = path.normalize((await paths.json()).directory)
  const expectedDirectory = path.normalize(project)
  assert.equal(
    process.platform === "win32" ? actualDirectory.toLowerCase() : actualDirectory,
    process.platform === "win32" ? expectedDirectory.toLowerCase() : expectedDirectory,
  )
  passed("authenticated health and project access")
  const document = await request("/", authorization)
  assert.equal(document.status, 200)
  assert.match(await document.text(), /<title>OpenCodex<\/title>/)
  passed("embedded OpenCodex document served")

  await browser(["set", "credentials", "opencodex", password])
  await browser(["set", "viewport", "1365", "900"])
  await browser(["open", origin])
  await browser([
    "wait",
    "--fn",
    "document.title === 'OpenCodex' && [...document.querySelectorAll('button')].some(x => x.textContent.trim() === 'Open project' && !x.disabled)",
  ])
  const home = await browser(["snapshot", "-i"])
  assert.equal(typeof home.snapshot, "string")
  const open = home.snapshot.match(/button "Open project" \[ref=(e\d+)\]/)
  assert(open, "The rendered home must contain an Open project button")
  await browser(["screenshot", path.join(output, "desktop.png")])
  passed("desktop interface renders and enables Open project")
  await browser(["click", `@${open[1]}`])
  await browser(["wait", "[role=dialog]"])
  const dialog = await browser(["snapshot", "-i"])
  assert.match(dialog.snapshot, /Search folders/)
  await browser(["find", "placeholder", "Search folders", "fill", project.replaceAll("\\", "/")])
  const folderSelector = `[data-directory-path=${JSON.stringify(project.replaceAll("\\", "/"))}]`
  await browser(["wait", folderSelector])
  await browser(["screenshot", path.join(output, "project-picker.png")])
  await browser(["click", folderSelector])
  await browser(["wait", "--fn", "location.pathname !== '/' && !document.querySelector('[role=dialog]')"])
  await browser(["snapshot", "-i"])
  passed("project picker finds and opens the synthetic project")
  await browser(["open", origin])
  await browser(["set", "viewport", "390", "844"])
  await browser([
    "wait",
    "--fn",
    "document.body.innerText.includes('OpenCodex') && [...document.querySelectorAll('button')].some(x => x.textContent.trim() === 'Open project' && !x.disabled)",
  ])
  await browser(["screenshot", path.join(output, "mobile.png")])
  passed("interface renders at a mobile viewport")
  const errors = await browser(["errors"])
  assert(Array.isArray(errors.errors), "Browser must return page-error evidence")
  assert.equal(errors.errors.length, 0, JSON.stringify(errors.errors))
  passed("no uncaught browser page errors")
  await browser(["close"])
  state.browser = false
  state.server.kill()
  await state.server.exited
  await captureLogs
} catch (error) {
  state.error = redact(error instanceof Error ? error.stack || error.message : String(error))
  console.error(state.error)
  if (state.browser) {
    for (const args of [
      ["snapshot"],
      ["errors"],
      ["console"],
      ["network", "requests"],
      ["screenshot", path.join(output, "failure.png")],
    ]) {
      await browser(args)
        .then((data) => console.error(redact(JSON.stringify({ diagnostic: args[0], data }))))
        .catch(() => {})
    }
  }
  process.exitCode = 1
} finally {
  if (state.browser) await browser(["close"]).catch(() => {})
  if (state.server && state.server.exitCode === null) {
    state.server.kill()
    await state.server.exited
  }
  await Bun.write(path.join(output, "server.log"), redact(serverLog.join("")))
  await Bun.write(path.join(output, "browser.json"), JSON.stringify(browserLog, null, 2) + "\n")
  await Bun.write(
    path.join(output, "report.json"),
    JSON.stringify(
      {
        status: state.error ? "failed" : "passed",
        target,
        commit: process.env.GITHUB_SHA ?? null,
        workflow: process.env.GITHUB_RUN_ID ?? null,
        binarySha256: new Bun.CryptoHasher("sha256").update(await Bun.file(binary).arrayBuffer()).digest("hex"),
        checks,
        error: state.error ?? null,
        scope:
          "Native executable, local server authentication, embedded browser UI, and project picker. No model inference or Windows double-click browser launch is covered.",
      },
      null,
      2,
    ) + "\n",
  )
  await rm(temporary, { recursive: true, force: true })
}
