require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const collectionRoutes = require("./routes/collections");
const logRoutes = require("./routes/logs");
const detectRoutes = require("./routes/detect");
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const app = express();

// ─── middleware ───────────────────────────────────────────────────────
app.use(
  cors({
    // origin: "http://localhost:5173", // Vite dev server
      origin: "https://vehicle-detection-system-slyf.onrender.com",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ─── routes ──────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/detect", detectRoutes);

// health check
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ─── start ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.log("⚠️  Starting server without DB (replace MONGO_URI in .env)");
    app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT} (no DB)`));
  });
