const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { verifyToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const {
  getMisChoferes,
  getRutaActualChofer,
  getHistorialChofer,
  getKpisChofer,
  getReporteEquipo,
  crearRuta,
  asignarChoferRuta,
  cambiarEstadoRuta,
} = require("../controllers/adminController");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(limiter);
router.use(verifyToken);
router.use(requireRole("ADMIN"));

// GET /api/admin/mis-choferes
router.get("/mis-choferes", getMisChoferes);

// GET /api/admin/choferes/:id/ruta-actual
router.get("/choferes/:id/ruta-actual", getRutaActualChofer);

// GET /api/admin/choferes/:id/historial
router.get("/choferes/:id/historial", getHistorialChofer);

// GET /api/admin/choferes/:id/kpis
router.get("/choferes/:id/kpis", getKpisChofer);

// GET /api/admin/reportes/mi-equipo
router.get("/reportes/mi-equipo", getReporteEquipo);

// POST /api/admin/rutas
router.post("/rutas", crearRuta);

// PUT /api/admin/rutas/:id/asignar
router.put("/rutas/:id/asignar", asignarChoferRuta);

// PUT /api/admin/rutas/:id/estado
router.put("/rutas/:id/estado", cambiarEstadoRuta);

module.exports = router;
