import cors from "cors";
import express from "express";
import { clientOrigin } from "./constants";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import apiRouter from "./routes";
import uploadRoutes from './routes/uploadRoutes';

export function createApp(): express.Express {
  const app = express();
  app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"] }));
  app.use(express.json());
  
  // Main API router
  app.use("/api", apiRouter);
  
  // Our new upload route
  app.use("/api/upload", uploadRoutes);
  
  // Error handlers MUST be at the very bottom
  app.use(notFound);
  app.use(errorHandler);
  
  return app;
}

export const app = createApp();