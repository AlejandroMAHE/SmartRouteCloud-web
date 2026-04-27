const { db, admin } = require("../config/firebaseAdmin");

// GET /api/ti/todos-choferes - Ver todos los choferes del sistema
async function getTodosChoferes(req, res) {
  try {
    const choferesSnapshot = await db
      .collection("users")
      .where("role", "==", "CHOFER")
      .get();

    const choferes = choferesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ choferes });
  } catch (error) {
    console.error("ti error:", error);
    res.status(500).json({ error: "Error al obtener los choferes" });
  }
}

// GET /api/ti/todas-rutas - Ver todas las rutas del sistema
async function getTodasRutas(req, res) {
  try {
    const routesSnapshot = await db
      .collection("routes")
      .orderBy("fechaProgramada", "desc")
      .get();

    const rutas = routesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ rutas });
  } catch (error) {
    console.error("ti error:", error);
    res.status(500).json({ error: "Error al obtener las rutas" });
  }
}

// GET /api/ti/reportes/sistema - KPIs del sistema completo
async function getReportesSistema(req, res) {
  try {
    const [usersSnapshot, routesSnapshot] = await Promise.all([
      db.collection("users").get(),
      db.collection("routes").get(),
    ]);

    let totalChoferes = 0;
    let totalAdmins = 0;
    let totalTI = 0;
    let usuariosActivos = 0;

    usersSnapshot.docs.forEach((doc) => {
      const user = doc.data();
      if (user.role === "CHOFER") totalChoferes++;
      if (user.role === "ADMIN") totalAdmins++;
      if (user.role === "TI") totalTI++;
      if (user.estado === "activo") usuariosActivos++;
    });

    let totalRutas = routesSnapshot.size;
    let rutasActivas = 0;
    let totalEntregas = 0;
    let entregasCompletadas = 0;
    let entregasFallidas = 0;

    routesSnapshot.docs.forEach((doc) => {
      const ruta = doc.data();
      if (ruta.estado === "activa") rutasActivas++;
      if (ruta.entregas && Array.isArray(ruta.entregas)) {
        ruta.entregas.forEach((entrega) => {
          totalEntregas++;
          if (entrega.estado === "completada") entregasCompletadas++;
          if (entrega.estado === "fallida") entregasFallidas++;
        });
      }
    });

    res.json({
      usuarios: {
        total: usersSnapshot.size,
        activos: usuariosActivos,
        choferes: totalChoferes,
        admins: totalAdmins,
        ti: totalTI,
      },
      rutas: {
        total: totalRutas,
        activas: rutasActivas,
      },
      entregas: {
        total: totalEntregas,
        completadas: entregasCompletadas,
        fallidas: entregasFallidas,
        tasaExito:
          totalEntregas > 0 ? Math.round((entregasCompletadas / totalEntregas) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("ti error:", error);
    res.status(500).json({ error: "Error al obtener reportes del sistema" });
  }
}

// POST /api/ti/users - Crear usuario
async function crearUsuario(req, res) {
  try {
    const { email, password, nombre, role, adminAsignado } = req.body;

    if (!email || !password || !nombre || !role) {
      return res.status(400).json({ error: "email, password, nombre y role son requeridos" });
    }

    const rolesValidos = ["CHOFER", "ADMIN", "TI"];
    if (!rolesValidos.includes(role)) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    const userRecord = await admin.auth().createUser({ email, password, displayName: nombre });

    const nuevoUsuario = {
      nombre,
      email,
      role,
      estado: "activo",
      adminAsignado: role === "CHOFER" ? adminAsignado || null : null,
      choferesAsignados: role === "ADMIN" ? [] : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("users").doc(userRecord.uid).set(nuevoUsuario);

    res.status(201).json({ id: userRecord.uid, ...nuevoUsuario });
  } catch (error) {
    console.error("ti error:", error);
    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({ error: "El email ya está registrado" });
    }
    res.status(500).json({ error: "Error al crear el usuario" });
  }
}

// PUT /api/ti/users/:id/role - Cambiar rol de usuario
async function cambiarRolUsuario(req, res) {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    const rolesValidos = ["CHOFER", "ADMIN", "TI"];
    if (!rolesValidos.includes(role)) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await userDoc.ref.update({ role, updatedAt: new Date() });
    res.json({ message: "Rol actualizado correctamente" });
  } catch (error) {
    console.error("ti error:", error);
    res.status(500).json({ error: "Error al cambiar el rol del usuario" });
  }
}

// DELETE /api/ti/users/:id - Eliminar usuario
async function eliminarUsuario(req, res) {
  try {
    const userId = req.params.id;

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await admin.auth().deleteUser(userId);
    await userDoc.ref.delete();

    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("ti error:", error);
    if (error.code === "auth/user-not-found") {
      return res.status(404).json({ error: "Usuario no encontrado en Auth" });
    }
    res.status(500).json({ error: "Error al eliminar el usuario" });
  }
}

module.exports = {
  getTodosChoferes,
  getTodasRutas,
  getReportesSistema,
  crearUsuario,
  cambiarRolUsuario,
  eliminarUsuario,
};
