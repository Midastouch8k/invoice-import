import type { Response } from "express";
import { httpStatus } from "../constants";

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = httpStatus.ok,
): void {
  res.status(statusCode).json(data);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = httpStatus.internalServerError,
): void {
  res.status(statusCode).json({ message });
}
