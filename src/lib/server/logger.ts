import { dev } from "$app/environment";
import pino from "pino";

const isTest = Boolean(process.env.VITEST);
const level = process.env.LOG_LEVEL ?? (isTest ? "silent" : dev ? "debug" : "info");

const sensitiveFields = [
  "authorization",
  "*.authorization",
  "*.*.authorization",
  "cookie",
  "*.cookie",
  "*.*.cookie",
  "password",
  "*.password",
  "*.*.password",
  "token",
  "*.token",
  "*.*.token",
  "apiKey",
  "*.apiKey",
  "*.*.apiKey",
  "apiSecret",
  "*.apiSecret",
  "*.*.apiSecret",
  "api_secret",
  "*.api_secret",
  "*.*.api_secret",
  "secret",
  "*.secret",
  "*.*.secret",
];

const options: pino.LoggerOptions = {
  level,
  redact: { paths: sensitiveFields, censor: "[REDACTED]" },
};

if (dev && level !== "silent") {
  options.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  };
}

export const logger = pino(options);

export function createLogger(service: string) {
  return logger.child({ service });
}
