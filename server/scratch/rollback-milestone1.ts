import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Table from "../src/models/table.model.js";

async function rollback() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI not found in env variables!");
    process.exit(1);
  }

  console.log("Connecting to MongoDB for rollback...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  console.log("Starting Table collection rollback...");
  const result = await Table.updateMany(
    {},
    {
      $unset: {
        operationalStatus: "",
        layout: "",
        isMerged: "",
        mergedWithTableIds: ""
      }
    }
  );

  console.log(`Rollback completed. Unset operationalStatus, layout, isMerged, and mergedWithTableIds on ${result.modifiedCount} table documents.`);
  await mongoose.connection.close();
  console.log("MongoDB connection closed.");
}

rollback().catch((err) => {
  console.error("Rollback failed:", err);
  process.exit(1);
});
