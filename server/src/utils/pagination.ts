import type { Request } from "express";
import { ApiError } from "./errors";

export type Pagination = { page: number; pageSize: number; skip: number };

export function getPagination(
  query: Request["query"],
  defaultPageSize = 50,
  maxPageSize = 200,
): Pagination {
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, Number.parseInt(String(query.pageSize ?? String(defaultPageSize)), 10) || defaultPageSize),
  );
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function parseIdList(value: unknown, max = 1000): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw ApiError.badRequest("`ids` must be an array of row ids");
  }
  const ids = value
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .slice(0, max);
  if (ids.length === 0) {
    throw ApiError.badRequest("`ids` must contain at least one row id");
  }
  return ids;
}
