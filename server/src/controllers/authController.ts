import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../db/index";
import { ApiError } from "../utils/errors";
import { signAuthToken } from "../utils/jwt";
import { verifyPassword } from "../utils/password";
import { sendSuccess } from "../utils/response";
import { getLocationScope } from "../utils/scope";
import type { AuthUser } from "../types/express";

const locationSelection = { id: true, code: true, name: true } satisfies Prisma.LocationSelect;

const userSelection = {
  id: true,
  email: true,
  name: true,
  role: true,
  organizationId: true,
  organization: { select: { id: true, name: true } },
  locations: { select: { location: { select: locationSelection } } },
} satisfies Prisma.UserSelect;

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: AuthUser["role"];
  organization: { id: string; name: string };
  locations: { id: string; code: string; name: string }[];
};

async function buildSessionUser(userId: string): Promise<SessionUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelection,
  });
  if (!user) throw ApiError.unauthorized("User no longer exists");

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    locationIds: user.locations.map((l) => l.location.id),
  };

  // HQ-wide roles see every location in the org; everyone else sees their own.
  const locations = getLocationScope(authUser).orgWide
    ? await prisma.location.findMany({
        where: { organizationId: user.organizationId },
        select: locationSelection,
        orderBy: { code: "asc" },
      })
    : user.locations.map((l) => l.location);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organization: user.organization,
    locations,
  };
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as { email?: unknown; password?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    throw ApiError.badRequest("Email and password are required");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password (no user enumeration).
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = await signAuthToken({ sub: user.id, role: user.role, org: user.organizationId });
  const sessionUser = await buildSessionUser(user.id);
  sendSuccess(res, { token, user: sessionUser });
}

export async function me(req: Request, res: Response): Promise<void> {
  const sessionUser = await buildSessionUser(req.user!.id);
  sendSuccess(res, sessionUser);
}
