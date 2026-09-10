import { randomUUID } from "node:crypto"

export function prepare(args: string[], env: Record<string, string | undefined>) {
  const local = args[0] === "local"
  if (local && (!args[1] || args[1].startsWith("-"))) {
    throw new Error("Usage: opencodex local <installed-ollama-model>")
  }
  const argv = local
    ? ["web", ...args.slice(2)]
    : args[0] === "tui"
      ? args.slice(1)
      : args.length === 0
        ? ["web", "--hostname", "127.0.0.1", "--port", "4096"]
        : args
  const web = argv[0] === "web" || argv[0] === "serve"
  const password = web ? env.OPENCODE_SERVER_PASSWORD || randomUUID() : undefined
  const username = env.OPENCODE_SERVER_USERNAME || "opencodex"
  const config = local ? JSON.parse(env.OPENCODE_CONFIG_CONTENT || "{}") : undefined
  return {
    args: argv,
    env: {
      ...env,
      OPENCODE_DISTRIBUTION: "opencodex",
      OPENCODE_DISABLE_AUTOUPDATE: "1",
      ...(web ? { OPENCODE_SERVER_PASSWORD: password, OPENCODE_SERVER_USERNAME: username } : {}),
      ...(local
        ? {
            OPENCODE_CONFIG_CONTENT: JSON.stringify({
              ...config,
              model: `ollama/${args[1]}`,
              enabled_providers: ["ollama"],
              provider: {
                ...config.provider,
                ollama: {
                  npm: "@ai-sdk/openai-compatible",
                  name: "Ollama (local)",
                  options: { baseURL: "http://127.0.0.1:11434/v1" },
                  models: { [args[1]]: { name: args[1] } },
                },
              },
            }),
          }
        : {}),
    },
    credentials: web && !env.OPENCODE_SERVER_PASSWORD ? { username, password } : undefined,
  }
}
