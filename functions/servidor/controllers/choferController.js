const { db } = require("../config/firebaseAdmin");

// GET /api/chofer/mi-ruta - Ver ruta activa del chofer
async function getMiRuta(req, res) {
  try {
    const choferUid = req.user.uid;

    const routesSnapshot = await db
      .collection("routes")
      .where("choferAsignado", "==", choferUid)
      .where("estado", "==", "activa")
      .orderBy("fechaProgramada", "desc")
      .limit(1)
      .get();

    if (routesSnapshot.empty) {
      return res.status(404).json({ error: "No tienes una ruta activa" });
    }

    const ruta = { id: routesSnapshot.docs[0].id, ...routesSnapshot.docs[0].data() };
    res.json(ruta);
  } catch (error) {
    console.error("chofer error:", error);
    res.status(500).json({ error: "Error al obtener la ruta activa" });
  }
}

// GET /api/chofer/mi-ruta/entregas - Ver entregas de hoy
async function getMisEntregas(req, res) {
  try {
    const choferUid = req.user.uid;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const routesSnapshot = await db
      .collection("routes")
      .where("choferAsignado", "==", choferUid)
      .where("fechaProgramada", ">=", hoy)
      .where("fechaProgramada", "<", manana)
      .get();

    if (routesSnapshot.empty) {
      return res.json({ entregas: [] });
    }

    const entregas = [];
    routesSnapshot.docs.forEach((doc) => {
      const ruta = doc.data();
      if (ruta.entregas && Array.isArray(ruta.entregas)) {
        ruta.entregas.forEach((entrega) => {
          entregas.push({ ...entrega, rutaId: doc.id });
        });
      }
    });

    res.json({ entregas });
  } catch (error) {
    console.error("chofer error:", error);
    res.status(500).json({ error: "Error al obtener las entregas de hoy" });
  }
}

// GET /api/chofer/mis-rutas-futuras - Ver rutas programadas
async function getMisRutasFuturas(req, res) {
  try {
    const choferUid = req.user.uid;
    const ahora = new Date();

    const routesSnapshot = await db
      .collection("routes")
      .where("choferAsignado", "==", choferUid)
      .where("fechaProgramada", ">", ahora)
      .orderBy("fechaProgramada", "asc")
      .get();

    const rutas = routesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ rutas });
  } catch (error) {
    console.error("chofer error:", error);
    res.status(500).json({ error: "Error al obtener las rutas futuras" });
  }
}

// PUT /api/chofer/entregas/:id - Marcar entrega como completada
async function actualizarEntrega(req, res) {
  try {
    const choferUid = req.user.uid;
    const entregaId = req.params.id;
    const { estado, observaciones, ubicacion } = req.body;

    const estadosValidos = ["completada", "fallida", "en_proceso"];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    const routesSnapshot = await db
      .collection("routes")
      .where("choferAsignado", "==", choferUid)
      .get();

    if (routesSnapshot.empty) {
      return res.status(404).json({ error: "No se encontró la entrega" });
    }

    let rutaDoc = null;
    let entregaIndex = -1;

    for (const doc of routesSnapshot.docs) {
      const ruta = doc.data();
      if (ruta.entregas && Array.isArray(ruta.entregas)) {
        const idx = ruta.entregas.findIndex((e) => e.id === entregaId);
        if (idx !== -1) {
          rutaDoc = doc;
          entregaIndex = idx;
          break;
        }
      }
    }

    if (!rutaDoc || entregaIndex === -1) {
      return res.status(404).json({ error: "Entrega no encontrada" });
    }

    const ruta = rutaDoc.data();
    const entregas = [...ruta.entregas];
    entregas[entregaIndex] = {
      ...entregas[entregaIndex],
      estado,
      observaciones: observaciones || "",
      ubicacionEntrega: ubicacion || null,
      fechaActualizacion: new Date(),
    };

    await rutaDoc.ref.update({ entregas, updatedAt: new Date() });

    res.json({ message: "Entrega actualizada correctamente", entrega: entregas[entregaIndex] });
  } catch (error) {
    console.error("chofer error:", error);
    res.status(500).json({ error: "Error al actualizar la entrega" });
  }
}

module.exports = { getMiRuta, getMisEntregas, getMisRutasFuturas, actualizarEntrega };
