import { defaultPort } from "../constants";

const bunEnv = typeof Bun === "undefined" ? undefined : Bun.env;

export function getEnv(name: string, fallback?: string): string {
  const value = bunEnv?.[name] ?? process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getPort(): number {
  return Number(getEnv("PORT", String(defaultPort)));
}

export function getNodeEnv(): string {
  return getEnv("NODE_ENV", "development");
}
