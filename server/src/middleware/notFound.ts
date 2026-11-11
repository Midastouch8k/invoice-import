import type { NextFunction, Request, Response } from "express";
import { httpStatus } from "../constants";

export function notFound(req: Request, res: Response, next: NextFunction): void {
  res.status(httpStatus.notFound);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
}
