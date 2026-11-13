import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";
import { getEnv, getTokenExpiresIn } from "./env";
import { ApiError } from "./errors";

export type TokenPayload = { sub: string; role: UserRole; org: string };

function getSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv("JWT_SECRET"));
}

export async function signAuthToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role, org: payload.org })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(getTokenExpiresIn())
    .sign(getSecret());
}

export async function verifyAuthToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.org !== "string" || typeof payload.role !== "string") {
      throw new Error("Malformed token payload");
    }
    return { sub: payload.sub, org: payload.org, role: payload.role as UserRole };
  } catch {
    throw ApiError.unauthorized("Invalid or expired session token");
  }
}
