import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const connectToMongoDB = async (): Promise<void> => {
  if (!process.env.MONGO_URI) {
    throw new Error('[DineIn] MONGO_URI environment variable is missing');
  }

  const mongoUri = process.env.MONGO_URI as string;

  mongoose.connection.on('connected', () => {
    logger.info('[DineIn MongoDB] Connection established');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('[DineIn MongoDB] Connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('[DineIn MongoDB] Disconnected. Attempting to reconnect...');
  });

  await mongoose.connect(mongoUri, {
    maxPoolSize: 50,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
};

export default connectToMongoDB;
