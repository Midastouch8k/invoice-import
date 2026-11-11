import type { NextFunction, Request, Response } from "express";
import { httpStatus } from "../constants";
import { sendError } from "../utils/response";

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode =
    res.statusCode === httpStatus.ok ? httpStatus.internalServerError : res.statusCode;
  sendError(res, error.message, statusCode);
}
