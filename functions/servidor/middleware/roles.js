const { db } = require("../config/firebaseAdmin");

function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const userDoc = await db.collection("users").doc(req.user.uid).get();

      if (!userDoc.exists) {
        return res.status(403).json({ error: "Usuario no encontrado" });
      }

      const userData = userDoc.data();
      req.userProfile = userData;

      if (!roles.includes(userData.role)) {
        return res.status(403).json({ error: "Acceso denegado: rol no autorizado" });
      }

      next();
    } catch (error) {
      console.error("requireRole error:", error);
      return res.status(500).json({ error: "Error al verificar permisos" });
    }
  };
}

module.exports = { requireRole };
