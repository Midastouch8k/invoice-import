import { defaultPort } from "../constants";

const bunEnv = typeof Bun === "undefined" ? undefined : Bun.env;

function read(name: string): string | undefined {
  return bunEnv?.[name] ?? process.env[name];
}

export function getEnv(name: string, fallback?: string): string {
  const value = read(name);
  if (value === undefined || value === "") {
    if (fallback === undefined) {
      throw new Error(`Missing environment variable: ${name}`);
    }
    return fallback;
  }
  return value;
}

export function getOptionalEnv(name: string, fallback?: string): string | undefined {
  const value = read(name);
  return value === undefined || value === "" ? fallback : value;
}

export function getPort(): number {
  return Number(getEnv("PORT", String(defaultPort)));
}

export function getNodeEnv(): string {
  return getEnv("NODE_ENV", "development");
}

export function getTokenExpiresIn(): string {
  return getEnv("JWT_EXPIRES_IN", "8h");
}
