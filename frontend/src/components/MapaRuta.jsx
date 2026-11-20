// Mapa de Leaflet centrado en Buenaventura. En modo edición el administrador
// hace clic para agregar puntos del inicio al final; el recorrido se dibuja
// uniendo los puntos en orden.
import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export const CENTRO_BUENAVENTURA = [3.8835, -77.0480];
const ZOOM_INICIAL = 14;

function CapturarClics({ onAgregar }) {
  useMapEvents({
    click(e) {
      onAgregar({ latitud: Number(e.latlng.lat.toFixed(6)), longitud: Number(e.latlng.lng.toFixed(6)) });
    },
  });
  return null;
}

function AjustarVista({ puntos }) {
  const mapa = useMap();
  useEffect(() => {
    if (puntos.length >= 2) {
      mapa.fitBounds(puntos.map((p) => [p.latitud, p.longitud]), { padding: [40, 40], maxZoom: 16 });
    } else if (puntos.length === 1) {
      mapa.setView([puntos[0].latitud, puntos[0].longitud], 15);
    }
    // Solo al montar: después el usuario controla el zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function MapaRuta({ puntos = [], editable = false, onCambiar, alto = 420 }) {
  const coordenadas = puntos.map((p) => [p.latitud, p.longitud]);

  const agregar = (punto) => onCambiar?.([...puntos, punto]);
  const quitarUltimo = () => onCambiar?.(puntos.slice(0, -1));
  const limpiar = () => onCambiar?.([]);
  const invertir = () => onCambiar?.([...puntos].reverse());

  return (
    <div className="mapa">
      {editable && (
        <div className="mapa__herramientas">
          <span className="mapa__ayuda">
            Haz clic en el mapa para marcar el recorrido, desde el <b>inicio</b> hasta el <b>final</b>. Puntos: {puntos.length}
          </span>
          <div className="mapa__botones">
            <button type="button" className="boton boton--claro boton--chico" onClick={quitarUltimo} disabled={!puntos.length}>
              Deshacer
            </button>
            <button type="button" className="boton boton--claro boton--chico" onClick={invertir} disabled={puntos.length < 2}>
              Invertir sentido
            </button>
            <button type="button" className="boton boton--claro boton--chico" onClick={limpiar} disabled={!puntos.length}>
              Borrar todo
            </button>
          </div>
        </div>
      )}
      <MapContainer
        center={CENTRO_BUENAVENTURA}
        zoom={ZOOM_INICIAL}
        style={{ height: alto }}
        className={editable ? 'mapa__lienzo mapa__lienzo--editable' : 'mapa__lienzo'}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AjustarVista puntos={puntos} />
        {editable && <CapturarClics onAgregar={agregar} />}
        {coordenadas.length >= 2 && <Polyline positions={coordenadas} pathOptions={{ color: '#0b5d4b', weight: 5, opacity: 0.85 }} />}
        {puntos.map((p, i) => {
          const esInicio = i === 0;
          const esFin = i === puntos.length - 1 && puntos.length > 1;
          return (
            <CircleMarker
              key={`${p.latitud}-${p.longitud}-${i}`}
              center={[p.latitud, p.longitud]}
              radius={esInicio || esFin ? 9 : 5}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillOpacity: 1,
                fillColor: esInicio ? '#1f9d55' : esFin ? '#c0392b' : '#0b5d4b',
              }}
            >
              <Tooltip direction="top">{esInicio ? 'Inicio' : esFin ? 'Final' : `Punto ${i + 1}`}</Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {!editable && puntos.length < 2 && <p className="mapa__nota">Esta ruta todavía no tiene trazado.</p>}
    </div>
  );
}
