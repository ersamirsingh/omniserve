import dotenv from "dotenv";
dotenv.config();

process.env.NODE_ENV = "test";

import mongoose from "mongoose";

const originalStartSession = mongoose.startSession;
(mongoose as any).startSession = async function(options?: any) {
  const session = await originalStartSession.call(mongoose, options);
  session.startTransaction = () => {};
  session.commitTransaction = async () => {};
  session.abortTransaction = async () => {};
  session.inTransaction = () => false;
  return session;
};

const MONGO_URIS = [
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/FoodMesh-Test"
];

export async function connectTestDB() {
  if (mongoose.connection.readyState !== 0) return;

  let connected = false;
  for (const uri of MONGO_URIS) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      console.log(`[TestDB] Connected successfully to ${uri}`);
      connected = true;
      break;
    } catch (e: any) {
      console.warn(`[TestDB] Connection failed for ${uri}: ${e.message}`);
    }
  }

  if (!connected) {
    throw new Error("Unable to connect to MongoDB for testing.");
  }
}

export async function closeTestDB() {
  await mongoose.disconnect();
}
