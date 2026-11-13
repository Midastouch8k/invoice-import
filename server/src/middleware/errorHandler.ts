import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/errors";
import { sendError } from "../utils/response";

/** Multer error codes we translate into client-friendly 400s. */
const MULTTER_ERROR_CODES: Record<string, string> = {
  LIMIT_FILE_SIZE: "Uploaded file is too large",
  LIMIT_UNEXPECTED_FILE: "Unexpected file field",
  LIMIT_FILE_COUNT: "Too many files uploaded",
};

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApiError) {
    sendError(res, error.message, error.status);
    return;
  }

  const code = (error as { code?: string } | null)?.code;
  if (code && MULTTER_ERROR_CODES[code]) {
    sendError(res, MULTTER_ERROR_CODES[code], 400);
    return;
  }

  // Body-parser JSON syntax errors carry a 4xx status; surface those safely.
  const status = (error as { status?: number } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    sendError(res, (error as Error).message || "Invalid request", status);
    return;
  }

  console.error("Unhandled error:", error);
  sendError(res, "Internal server error", 500);
}
