const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { connectDB } = require("./config/neon");

// Import Routes
const authRoutes = require("./routes/auth");
const authGoogleRoutes = require("./routes/authGoogle");
const itemRoutes = require("./routes/items");
const claimRoutes = require("./routes/claims");

const app = express();

// --------------- Middleware ---------------
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploaded files (local dev only)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --------------- Routes ---------------
app.use("/api/auth", authRoutes);
app.use("/api/auth", authGoogleRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/claims", claimRoutes);

// Health Check
app.get("/", (req, res) => {
  res.send("CampusFind API is running 🚀");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is reachable" });
});

// --------------- Start Server ---------------
const PORT = process.env.PORT || 5001;

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  // Connect immediately for local dev
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

module.exports = app;
