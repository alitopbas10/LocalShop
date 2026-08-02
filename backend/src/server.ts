import type { Server } from "http";

import { app } from "@/app";
import { connectDatabase, disconnectDatabase } from "@/config/database";
import { env } from "@/config/env";

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const server: Server = app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`${signal} received, shutting down gracefully`);
    server.close(() => {
      disconnectDatabase()
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          console.error("Error during database disconnect:", error);
          process.exit(1);
        });
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason: unknown) => {
    console.error("Unhandled rejection:", reason);
    server.close(() => process.exit(1));
  });

  process.on("uncaughtException", (error: Error) => {
    console.error("Uncaught exception:", error);
    server.close(() => process.exit(1));
  });
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
