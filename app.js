const app = require("./app");
const connectDB = require("./config/db");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start server
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });

  // Graceful shutdown on unhandled rejections
  process.on("unhandledRejection", (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM received. Shutting down gracefully.");
    server.close(() => process.exit(0));
  });
});