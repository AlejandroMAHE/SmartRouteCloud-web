const functions = require("firebase-functions/v1");
const express = require("express");
const cors = require("cors");

const choferRoutes = require("./servidor/routes/chofer");
const adminRoutes = require("./servidor/routes/admin");
const tiRoutes = require("./servidor/routes/ti");
const rutasRoutes = require("./servidor/routes/rutas");

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// API Routes
app.use("/api/chofer", choferRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ti", tiRoutes);
app.use("/api/rutas", rutasRoutes);

// 404 handler for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint no encontrado" });
});

// Exponer Express como Cloud Function en us-central1
exports.api = functions.region("us-central1").https.onRequest(app);
