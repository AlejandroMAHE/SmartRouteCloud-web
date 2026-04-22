import {
  iniciarMapa,
  obtenerUbicacion,
  calcularRuta,
  dibujarRutaColoreada,
  eliminarRuta,
  marcadorCarrito,
  agregarMarcadorEstado
} from "./tomtomAPI.js";
import { logout } from "./auth.js";
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// se modificó para que esto salga desde endpoint - patch
import { config } from "./config.js";

document.getElementById("btnLogout").addEventListener("click", logout);


// 🔐 PROTEGER DASHBOARD
onAuthStateChanged(auth, (user) => {
  if (!user) {
    //No hay sesión → regresar al login
    window.location.href = "/index.html";
  }
});

const map = iniciarMapa();

// se modificó para que esto salga desde endpoint - patch
// Estado central de envíos (se carga desde API en iniciarSistema)
let envios = [];

const coloresRuta = {
  "RETRASADO":   "#ef4444",
  "EN TRÁNSITO": "#FFA500"
};

// se modificó para que esto salga desde endpoint - patch
// Mapa de estados UI → estados de API backend
const estadoAPIMap = {
  "EN TRÁNSITO": "en_proceso",
  "ENTREGADO":   "completada",
  "RETRASADO":   "fallida"
};

// se modificó para que esto salga desde endpoint - patch
// Mapa inverso: estados de API backend → estados UI
const estadoUIMap = {
  "en_proceso": "EN TRÁNSITO",
  "completada": "ENTREGADO",
  "fallida":    "RETRASADO"
};

const marcadores = {}; // guarda referencia a cada marcador por id
let origenStr = null;

// ─── RENDERIZAR TABLA ───────────────────────────────────────────────
function renderTabla() {
  const tbody = document.getElementById("tabla-envios");
  tbody.innerHTML = "";

  envios.forEach(envio => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${envio.id}</td>
      <td>
        <select class="select-estado form-select form-select-sm" data-id="${envio.id}">
          <option value="EN TRÁNSITO"  ${envio.estado === "EN TRÁNSITO"  ? "selected" : ""}>EN TRÁNSITO</option>
          <option value="ENTREGADO"    ${envio.estado === "ENTREGADO"    ? "selected" : ""}>ENTREGADO</option>
          <option value="RETRASADO"    ${envio.estado === "RETRASADO"    ? "selected" : ""}>RETRASADO</option>
        </select>
      </td>
    `;

    // Estilo del select según estado
    const select = tr.querySelector("select");
    aplicarColorSelect(select, envio.estado);

    select.addEventListener("change", (e) => {
      const nuevoEstado = e.target.value;
      const id = e.target.dataset.id;
      cambiarEstado(id, nuevoEstado);
      aplicarColorSelect(e.target, nuevoEstado);
    });

    tbody.appendChild(tr);
  });

  actualizarResumen();
}

function aplicarColorSelect(select, estado) {
  const clases = {
    "EN TRÁNSITO": "text-warning border-warning",
    "ENTREGADO":   "text-success border-success",
    "RETRASADO":   "text-danger border-danger"
  };
  select.className = "select-estado form-select form-select-sm bg-light";
  select.classList.add(...clases[estado].split(" "));
}

// ─── ACTUALIZAR RESUMEN ──────────────────────────────────────────────
function actualizarResumen() {
  document.getElementById("transito").textContent =
    envios.filter(e => e.estado === "EN TRÁNSITO").length;
  document.getElementById("entregados").textContent =
    envios.filter(e => e.estado === "ENTREGADO").length;
  document.getElementById("retrasados").textContent =
    envios.filter(e => e.estado === "RETRASADO").length;
}

// ─── CAMBIAR ESTADO Y ACTUALIZAR MAPA ───────────────────────────────
async function cambiarEstado(id, nuevoEstado) {
  const envio = envios.find(e => e.id === id);
  if (!envio) return;

  envio.estado = nuevoEstado;
  actualizarResumen();

  // se modificó para que esto salga desde endpoint - patch
  // Actualizar estado en el backend vía PUT /api/chofer/entregas/:id
  try {
    const token = await auth.currentUser.getIdToken();
    await fetch(`${config.backendURL}/api/chofer/entregas/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ estado: estadoAPIMap[nuevoEstado] || nuevoEstado })
    });
  } catch (err) {
    console.error("Error al actualizar entrega en backend:", err);
  }

  // Actualizar marcador en mapa
  if (marcadores[id]) {
    marcadores[id].remove();
  }
  marcadores[id] = agregarMarcadorEstado(map, envio.lng, envio.lat, `${envio.id}`, nuevoEstado);

  // Si se entregó → eliminar ruta
  if (nuevoEstado === "ENTREGADO") {
    eliminarRuta(map, id);
    return;
  }

  // Si es EN TRÁNSITO o RETRASADO → trazar ruta
  if (!origenStr) return;
  const destino = `${envio.lat},${envio.lng}`;
  const puntos = await calcularRuta(origenStr, destino);
  if (puntos) {
    dibujarRutaColoreada(map, puntos, id, coloresRuta[nuevoEstado]);
  }
}

// ─── TRAZAR RUTAS INICIALES (prioridad: RETRASADO > EN TRÁNSITO) ────
async function trazarRutasIniciales() {
  const prioridad = ["RETRASADO", "EN TRÁNSITO"];

  for (const estado of prioridad) {
    const filtrados = envios.filter(e => e.estado === estado);
    for (const envio of filtrados) {
      const destino = `${envio.lat},${envio.lng}`;
      const puntos = await calcularRuta(origenStr, destino);
      if (puntos) {
        dibujarRutaColoreada(map, puntos, envio.id, coloresRuta[estado]);
      }
    }
  }
}

// ─── INICIO ─────────────────────────────────────────────────────────
// se modificó para que esto salga desde endpoint - patch
async function iniciarSistema() {
  try {
    const ubicacion = await obtenerUbicacion();
    origenStr = ubicacion;

    const [lat, lng] = ubicacion.split(",").map(v => parseFloat(v));
    map.setCenter([lng, lat]);
    map.setZoom(13);

    // Carrito
    marcadorCarrito(map, lng, lat, "Mi ubicación");

    // se modificó para que esto salga desde endpoint - patch
    // Obtener token de autenticación Firebase
    const token = await auth.currentUser.getIdToken();

    // se modificó para que esto salga desde endpoint - patch
    // Obtener tiempo estimado de ruta desde GET /api/chofer/mi-ruta
    try {
      const rutaRes = await fetch(`${config.backendURL}/api/chofer/mi-ruta`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (rutaRes.ok) {
        const ruta = await rutaRes.json();
        const tiempoEl = document.getElementById("tiempo-ruta");
        if (tiempoEl && ruta.tiempoEstimado) {
          tiempoEl.textContent = ruta.tiempoEstimado;
        }
      }
    } catch (err) {
      console.error("Error al obtener tiempo de ruta:", err);
    }

    // se modificó para que esto salga desde endpoint - patch
    // Obtener lista de entregas desde GET /api/chofer/mi-ruta/entregas
    try {
      const entregasRes = await fetch(`${config.backendURL}/api/chofer/mi-ruta/entregas`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (entregasRes.ok) {
        const data = await entregasRes.json();
        // se modificó para que esto salga desde endpoint - patch
        // Mapear respuesta de API al formato local de envíos
        envios = (data.entregas || []).reduce((acc, e) => {
          const lat = e.lat ?? e.latitud;
          const lng = e.lng ?? e.longitud;
          if (lat == null || lng == null) {
            console.warn(`Entrega ${e.id} sin coordenadas, se omite del mapa.`);
            return acc;
          }
          acc.push({
            id: e.id,
            lat,
            lng,
            estado: estadoUIMap[e.estado] ?? "EN TRÁNSITO"
          });
          return acc;
        }, []);
      }
    } catch (err) {
      console.error("Error al obtener entregas:", err);
    }

    // Marcadores de envíos
    envios.forEach(envio => {
      marcadores[envio.id] = agregarMarcadorEstado(
        map, envio.lng, envio.lat, envio.id, envio.estado
      );
    });

    // Rutas iniciales
    await trazarRutasIniciales();

    // Tabla
    renderTabla();

  } catch (error) {
    console.error("Error:", error);
  }
}

map.on("load", () => iniciarSistema());
