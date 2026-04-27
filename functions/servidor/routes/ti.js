const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { verifyToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const {
  getTodosChoferes,
  getTodasRutas,
  getReportesSistema,
  crearUsuario,
  cambiarRolUsuario,
  eliminarUsuario,
} = require("../controllers/tiController");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const mutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(limiter);
router.use(verifyToken);
router.use(requireRole("TI"));

// GET /api/ti/todos-choferes
router.get("/todos-choferes", getTodosChoferes);

// GET /api/ti/todas-rutas
router.get("/todas-rutas", getTodasRutas);

// GET /api/ti/reportes/sistema
router.get("/reportes/sistema", getReportesSistema);

// POST /api/ti/users
router.post("/users", mutationLimiter, crearUsuario);

// PUT /api/ti/users/:id/role
router.put("/users/:id/role", mutationLimiter, cambiarRolUsuario);

// DELETE /api/ti/users/:id
router.delete("/users/:id", mutationLimiter, eliminarUsuario);

module.exports = router;
