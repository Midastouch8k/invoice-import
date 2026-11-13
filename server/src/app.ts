import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { requestLogger } from "./middleware/requestLogger";
import apiRouter from "./routes";
import { getNodeEnv, getOptionalEnv } from "./utils/env";

export function createApp(): express.Express {
  const app = express();

  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    getOptionalEnv("CLIENT_URL"),
  ].filter((o): o is string => Boolean(o));

  // API hardening: security headers (CORP relaxed so the CORS-enabled
  // client can consume responses cross-origin).
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  if (getNodeEnv() !== "test") {
    app.use(requestLogger);
  }

  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
