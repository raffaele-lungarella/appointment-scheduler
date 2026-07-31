import { beforeEach, describe, expect, it, vi } from "vitest";

const { pinoMock, child } = vi.hoisted(() => {
  const child = vi.fn();
  return { pinoMock: vi.fn((_options: Record<string, unknown>) => ({ child })), child };
});

vi.mock("pino", () => ({ default: pinoMock }));

describe("logger", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("configures redaction for authentication and secret fields", async () => {
    await import("./logger");

    const options = pinoMock.mock.calls.at(-1)?.[0];
    expect(options).toBeDefined();
    const redact = options?.redact as { censor: string; paths: string[] };
    expect(redact.censor).toBe("[REDACTED]");
    expect(redact.paths).toEqual(
      expect.arrayContaining([
        "authorization",
        "*.authorization",
        "*.*.authorization",
        "cookie",
        "*.cookie",
        "password",
        "*.password",
        "token",
        "*.token",
        "apiKey",
        "*.apiKey",
        "apiSecret",
        "*.apiSecret",
        "api_secret",
        "*.api_secret",
      ]),
    );
  });

  it("preserves the service child logger interface", async () => {
    const { createLogger } = await import("./logger");
    createLogger("EmailService");
    expect(child).toHaveBeenCalledWith({ service: "EmailService" });
  });
});
