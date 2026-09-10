import { expect, test } from "bun:test"
import { prepare } from "../../src/opencodex/launch"

test("a fresh launch opens a loopback web server with a unique password", () => {
  const first = prepare([], {})
  const second = prepare([], {})
  expect(first.args).toEqual(["web", "--hostname", "127.0.0.1", "--port", "4096"])
  expect(first.env.OPENCODE_SERVER_PASSWORD).toHaveLength(36)
  expect(first.env.OPENCODE_SERVER_PASSWORD).not.toBe(second.env.OPENCODE_SERVER_PASSWORD)
  expect(first.env.OPENCODE_DISABLE_AUTOUPDATE).toBe("1")
})

test("existing server credentials and explicit command arguments are preserved", () => {
  const result = prepare(["serve", "--port", "5000"], {
    OPENCODE_SERVER_PASSWORD: "existing-password",
    OPENCODE_SERVER_USERNAME: "owner",
  })
  expect(result.args).toEqual(["serve", "--port", "5000"])
  expect(result.env.OPENCODE_SERVER_PASSWORD).toBe("existing-password")
  expect(result.env.OPENCODE_SERVER_USERNAME).toBe("owner")
  expect(result.credentials).toBeUndefined()
})

test("terminal and run commands do not become web sessions", () => {
  expect(prepare(["tui", "/my project"], {}).args).toEqual(["/my project"])
  const result = prepare(["run", "explain this repo"], {})
  expect(result.args).toEqual(["run", "explain this repo"])
  expect(result.env.OPENCODE_SERVER_PASSWORD).toBeUndefined()
})

test("local mode only enables the requested Ollama model and preserves unrelated config", () => {
  const result = prepare(["local", "my-model:4b", "--port", "5001"], {
    OPENCODE_CONFIG_CONTENT: JSON.stringify({ username: "owner", model: "paid/model" }),
  })
  const config = JSON.parse(result.env.OPENCODE_CONFIG_CONTENT!)
  expect(result.args).toEqual(["web", "--port", "5001"])
  expect(config.enabled_providers).toEqual(["ollama"])
  expect(config.model).toBe("ollama/my-model:4b")
  expect(config.provider.ollama.options.baseURL).toBe("http://127.0.0.1:11434/v1")
  expect(config.username).toBe("owner")
  expect(() => prepare(["local"], {})).toThrow("installed-ollama-model")
})
