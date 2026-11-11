import { app } from "./app";
import { getNodeEnv, getPort } from "./utils/env";

const port = getPort();

app.listen(port, () => {
  console.info(`Server listening on port ${port}`);
  console.info(`Environment: ${getNodeEnv()}`);
  console.info("Database: lazy Prisma connection");
});
