import type { Request, Response } from "express";
import { prisma } from "../db/index";
import { sendError, sendSuccess } from "../utils/response";
import type { HealthResponse } from "../types";

export async function getHealth(_req: Request, res: Response): Promise<void> {
  let db: HealthResponse["db"] = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
  } catch {
    db = "down";
  }
  sendSuccess(res, { status: "ok", db, timestamp: new Date().toISOString() });
}

export async function getReadiness(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, { status: "ready", db: "up", timestamp: new Date().toISOString() });
  } catch {
    sendError(res, "Database unavailable", 503);
  }
}
