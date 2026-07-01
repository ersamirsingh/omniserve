import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Table from "../src/models/table.model.js";

async function migrate() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI not found in env variables!");
    process.exit(1);
  }

  console.log("Connecting to MongoDB for migration...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  console.log("Starting Table collection migration...");
  const result = await Table.updateMany(
    {
      $or: [
        { operationalStatus: { $exists: false } },
        { operationalStatus: null },
        { layout: { $exists: false } },
        { isMerged: { $exists: false } },
        { mergedWithTableIds: { $exists: false } }
      ]
    },
    {
      $set: {
        operationalStatus: "AVAILABLE",
        layout: {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          shape: "SQUARE"
        },
        isMerged: false,
        mergedWithTableIds: []
      }
    }
  );

  console.log(`Migration completed. Modified ${result.modifiedCount} table documents.`);
  await mongoose.connection.close();
  console.log("MongoDB connection closed.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
