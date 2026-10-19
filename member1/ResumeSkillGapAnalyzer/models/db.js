
const mongoose = require("mongoose");
require("node:dns").setServers(["8.8.8.8"]);

async function connectDB() {
  try {
    const mongoUrl = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
