import { prepare } from "./opencodex/launch"

const args = process.argv.slice(2)
if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
  console.log(`OpenCodex — built on OpenCode

Usage:
  opencodex                         Open the browser workspace
  opencodex tui [project]            Open the terminal interface
  opencodex local MODEL              Use an installed Ollama model
  opencodex web [options]            Open the browser with server options
  opencodex serve [options]          Start the API server
  opencodex run "task"               Run a coding task
  opencodex models                   List available models
  opencodex providers login          Connect a model provider
  opencodex tui --help               Show all inherited engine options
  opencodex --version                Show the build version

The default workspace uses http://127.0.0.1:4096.
Web/server login credentials are printed when a password is generated.
OpenCodex is free software; model providers set their own prices and limits.`)
  process.exit(0)
}
if (args[0] === "upgrade" || args[0] === "uninstall") {
  console.error("OpenCodex is portable. Replace or remove its extracted folder to update or uninstall.")
  process.exit(1)
}
const launch = prepare(args, process.env)
Object.assign(process.env, launch.env)
process.argv.splice(2, process.argv.length - 2, ...launch.args)
if (launch.credentials && !args.includes("--help") && !args.includes("-h")) {
  console.error("\nOpenCodex — browser login for this launch")
  console.error(`Username: ${launch.credentials.username}`)
  console.error(`Password: ${launch.credentials.password}\n`)
}
await import("./index")
