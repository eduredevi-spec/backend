import app from "./app.js";
import config from "./config/index.js";
import { connectDB, disconnectDB } from "./loaders/mongoose.js";
import { logger } from "./utils/logger.js";

async function start() {
  await connectDB();

  if (!config.email.isConfigured) {
    logger.warn(
      "Email service is not configured; OTP and reset email routes will return 503",
      { missingEmailEnvFields: config.email.missingEnvFields },
    );
  }

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  logger.error("Failed to start server", { message: err.message });
  process.exit(1);
});
