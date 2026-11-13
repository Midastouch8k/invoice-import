import { UserRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/errors";

/** Roles allowed to import/review/approve invoices. */
export const WRITE_ROLES: UserRole[] = [
  UserRole.HQ_ADMIN,
  UserRole.REGIONAL_MANAGER,
  UserRole.FRANCHISEE,
  UserRole.AP_CLERK,
];

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(ApiError.unauthorized());
      return;
    }
    if (roles.length > 0 && !roles.includes(user.role)) {
      next(ApiError.forbidden(`Role ${user.role} is not permitted to perform this action`));
      return;
    }
    next();
  };
}
