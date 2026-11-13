import { app } from "./app";
import { getNodeEnv, getPort } from "./utils/env";
import { prisma } from "./db";

const port = getPort();

const server = app.listen(port, () => {
  console.info(`Server listening on port ${port}`);
  console.info(`Environment: ${getNodeEnv()}`);
});

async function shutdown(signal: string): Promise<void> {
  console.info(`Received ${signal}, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force-exit if connections do not drain in time.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
