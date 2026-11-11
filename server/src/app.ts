import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import apiRouter from "./routes";
import uploadRoutes from "./routes/uploadRoutes";

export function createApp(): express.Express {
  const app = express();

  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    process.env.CLIENT_URL,
  ].filter((o): o is string => Boolean(o));

  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json());

  app.use("/api", apiRouter);
  app.use("/api/upload", uploadRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();