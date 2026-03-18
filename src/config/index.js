const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongodb: {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      "mongodb://localhost:27017/money-manager",
  },
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      "your-access-secret-change-in-production",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      "your-refresh-secret-change-in-production",
    accessExpiresIn: "15m",
    refreshExpiresIn: "30d",
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || "noreply@moneymanager.com",
  },
  bcrypt: {
    saltRounds: 12,
  },
};

export default config;

// Named exports for backward compatibility with existing loaders and server.js
export const env = config.nodeEnv;
export const port = config.port;
export const mongoUri = config.mongodb.uri;
export const jwt = config.jwt;
export const cors = config.cors;
