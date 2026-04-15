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

document.getElementById("btnLogout").addEventListener("click", logout);


// 🔐 PROTEGER DASHBOARD
onAuthStateChanged(auth, (user) => {
  if (!user) {
    //No hay sesión → regresar al login
    window.location.href = "/index.html";
  }
});

const map = iniciarMapa();

// Estado central de envíos
let envios = [
  { id: "ML1001", lat: 19.4326, lng: -99.1332, estado: "EN TRÁNSITO" },
  { id: "ML1002", lat: 19.4195, lng: -99.1652, estado: "ENTREGADO" },
  { id: "ML1003", lat: 19.3910, lng: -99.0838, estado: "RETRASADO" },
  { id: "ML1004", lat: 19.4780, lng: -99.1429, estado: "EN TRÁNSITO" },
  { id: "ML1005", lat: 19.4060, lng: -99.1713, estado: "ENTREGADO" }
];

const coloresRuta = {
  "RETRASADO":   "#ef4444",
  "EN TRÁNSITO": "#FFA500"
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
async function iniciarSistema() {
  try {
    const ubicacion = await obtenerUbicacion();
    origenStr = ubicacion;

    const [lat, lng] = ubicacion.split(",").map(v => parseFloat(v));
    map.setCenter([lng, lat]);
    map.setZoom(13);

    // Carrito
    marcadorCarrito(map, lng, lat, "Mi ubicación");

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
