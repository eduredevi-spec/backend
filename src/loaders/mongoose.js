import mongoose from 'mongoose';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

export const connectDB = async () => {
  await mongoose.connect(config.mongodb.uri);
  logger.info('MongoDB connected');
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info('MongoDB disconnected');
};
