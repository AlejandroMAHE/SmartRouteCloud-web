import { config } from "./config.js";
const apiKey = config.tomtomKey;

//INICIAR MAPA
export function iniciarMapa() {
  const map = tt.map({
    key: apiKey,
    container: "map",
    center: [-99.1332, 19.4326], // temporal (luego se actualiza)
    zoom: 12
  });

  map.addControl(new tt.NavigationControl());

  return map;
}

export function obtenerUbicacion() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);

      
        resolve(`${lat},${lng}`);
      },
      (err) => reject(err)
    );
  });
}

//CALCULAR RUTA
export async function calcularRuta(origen, destino) {

  // limpiar espacios
  origen = origen.replace(/\s+/g, '');
  destino = destino.replace(/\s+/g, '');

  console.log("ORIGEN LIMPIO:", origen);
  console.log("DESTINO LIMPIO:", destino);

  const url = `https://api.tomtom.com/routing/1/calculateRoute/${origen}:${destino}/json?key=${apiKey}`;

  console.log("URL FINAL:", url);

  const response = await fetch(url);

  if (!response.ok) {
    console.error("Error API:", response.status);
    const text = await response.text();
    console.error("Detalle:", text);
    return null;
  }

  const data = await response.json();

  return data.routes?.[0]?.legs?.[0]?.points || null;
}

//DIBUJAR RUTA
// ✅ Correcto
export function dibujarRuta(map, puntos) {
  const coordenadas = puntos.map(p => [p.longitude, p.latitude]);

  const dibujar = () => {
    if (map.getSource("ruta")) {
      map.removeLayer("ruta");
      map.removeSource("ruta");
    }
    map.addSource("ruta", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "LineString", coordinates: coordenadas }
      }
    });
    map.addLayer({
      id: "ruta",
      type: "line",
      source: "ruta",
      paint: { "line-color": "#007AFF", "line-width": 5 }
    });
  };

  // Si el estilo ya cargó, dibuja de inmediato; si no, espera
  if (map.isStyleLoaded()) {
    dibujar();
  } else {
    map.on("load", dibujar);
  }
}

//MARCADOR PERSONALIZADO (CARRO AMARILLO)
export function marcadorCarrito(map, lng, lat, texto) {
  const el = document.createElement("div");

  el.innerHTML = "🚚";
  el.style.fontSize = "30px";
  el.style.color = "yellow";

  new tt.Marker({ element: el })
    .setLngLat([parseFloat(lng), parseFloat(lat)])
    .setPopup(new tt.Popup().setText(texto))
    .addTo(map);
}

//MARCADOR
export function agregarMarcadorEstado(map, lng, lat, texto, estado) {
  const el = document.createElement("div");

  const colores = {
    "EN TRÁNSITO": "#FFA500",
    "ENTREGADO":   "#22c55e",
    "RETRASADO":   "#ef4444"
  };
  const color = colores[estado] || "#888";

  el.style.cssText = `
    width: 18px; height: 18px;
    background-color: ${color};
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    cursor: pointer;
  `;

  const marker = new tt.Marker({ element: el })
    .setLngLat([parseFloat(lng), parseFloat(lat)])
    .setPopup(new tt.Popup().setHTML(`
      <strong>${texto}</strong><br/>
      <span style="color:${color}; font-weight:bold;">${estado}</span>
    `))
    .addTo(map);

  return marker; // ← importante
}

export function dibujarRutaColoreada(map, puntos, id, color) {
  const coordenadas = puntos.map(p => [p.longitude, p.latitude]);
  const sourceId = `ruta-${id}`;
  const layerId  = `layer-${id}`;

  const dibujar = () => {
    if (map.getSource(sourceId)) {
      map.removeLayer(layerId);
      map.removeSource(sourceId);
    }
    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "LineString", coordinates: coordenadas }
      }
    });
    map.addLayer({
      id: layerId, type: "line", source: sourceId,
      paint: { "line-color": color, "line-width": 4 }
    });
  };

  map.isStyleLoaded() ? dibujar() : map.on("load", dibujar);
}

export function eliminarRuta(map, id) {
  const sourceId = `ruta-${id}`;
  const layerId  = `layer-${id}`;
  if (map.getLayer(layerId))  map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}