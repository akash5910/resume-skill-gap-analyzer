const path = require("path");
const dns = require("dns");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
dns.setServers(["8.8.8.8"]);
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const port = process.env.MEMBER2_PORT || 5001;
const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URI;
app.use(cors());
app.use(express.json());
app.use("/api/jobroles", require("./routes/jobRoles"));
app.use("/api/analyze", require("./routes/analyze"));

if (!mongoUrl) {
  console.error("Database error: Add MONGODB_URI or MONGO_URI to the project .env file.");
  process.exit(1);
}

mongoose.connect(mongoUrl)
  .then(() => app.listen(port, () => console.log(`Member 2 server running on port ${port}`)))
  .catch((e) => {
    console.error("Database error:", e.message);
    process.exit(1);
  });
