const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { verifyToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const {
  getMiRuta,
  getMisEntregas,
  getMisRutasFuturas,
  actualizarEntrega,
} = require("../controllers/choferController");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(limiter);
router.use(verifyToken);
router.use(requireRole("CHOFER"));

// GET /api/chofer/mi-ruta
router.get("/mi-ruta", getMiRuta);

// GET /api/chofer/mi-ruta/entregas
router.get("/mi-ruta/entregas", getMisEntregas);

// GET /api/chofer/mis-rutas-futuras
router.get("/mis-rutas-futuras", getMisRutasFuturas);

// PUT /api/chofer/entregas/:id
router.put("/entregas/:id", actualizarEntrega);

module.exports = router;
