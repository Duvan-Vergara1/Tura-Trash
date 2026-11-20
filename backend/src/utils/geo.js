// Cálculos geográficos simples para los trazados de las rutas.

const RADIO_TIERRA_M = 6371000;

function aRadianes(grados) {
  return (grados * Math.PI) / 180;
}

/** Distancia en metros entre dos puntos {latitud, longitud} (fórmula de Haversine). */
function distanciaMetros(a, b) {
  const dLat = aRadianes(b.latitud - a.latitud);
  const dLng = aRadianes(b.longitud - a.longitud);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(a.latitud)) * Math.cos(aRadianes(b.latitud)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
}

/** Longitud total de un recorrido ordenado, redondeada al metro. */
function distanciaRutaMetros(puntos) {
  let total = 0;
  for (let i = 1; i < puntos.length; i += 1) {
    total += distanciaMetros(puntos[i - 1], puntos[i]);
  }
  return Math.round(total);
}

module.exports = { distanciaMetros, distanciaRutaMetros };
