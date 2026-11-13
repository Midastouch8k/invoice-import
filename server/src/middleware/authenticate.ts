import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/index";
import type { AuthUser } from "../types/express";
import { ApiError } from "../utils/errors";
import { verifyAuthToken } from "../utils/jwt";

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Missing bearer token");
    }

    const payload = await verifyAuthToken(header.slice("Bearer ".length).trim());

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        locations: { select: { locationId: true } },
      },
    });
    if (!user) throw ApiError.unauthorized("User no longer exists");

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      locationIds: user.locations.map((l) => l.locationId),
    };
    req.user = authUser;
    next();
  } catch (error) {
    next(error);
  }
}
