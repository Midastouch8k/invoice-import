import type { AuthUser } from "../types/express";
import { ApiError } from "./errors";

export type LocationScope = {
  /** HQ admins and regional managers see every location in the org. */
  orgWide: boolean;
  locationIds: string[];
  /** Prisma `where` fragment restricting queries to the user's locations. */
  where: { organizationId: string; locationId?: { in: string[] } };
};

export function getLocationScope(user: AuthUser): LocationScope {
  const orgWide = user.role === "HQ_ADMIN" || user.role === "REGIONAL_MANAGER";
  return {
    orgWide,
    locationIds: user.locationIds,
    where: {
      organizationId: user.organizationId,
      ...(orgWide ? {} : { locationId: { in: user.locationIds } }),
    },
  };
}

export function assertLocationAccess(user: AuthUser, locationId: string): void {
  const scope = getLocationScope(user);
  if (scope.orgWide) return;
  if (!scope.locationIds.includes(locationId)) {
    throw ApiError.forbidden("You do not have access to this location");
  }
}
