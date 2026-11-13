import type { UserRole } from "@prisma/client";

export type { UserRole };

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  locationIds: string[];
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
