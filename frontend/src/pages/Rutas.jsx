import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, query } from '../api/cliente';
import { Advertencias, Aviso, Cargando, EncabezadoPagina, EstadoInsignia, Insignia, Vacio, useCarga } from '../components/UI';
import { ESTADOS_RUTA, TIPOS_SERVICIO, distanciaTexto, opciones } from '../utils/formato';

export default function Rutas() {
  const ubicacion = useLocation();
  const [filtros, setFiltros] = useState({ q: '', estado: '', tipo_servicio: '' });
  const [exito, setExito] = useState(ubicacion.state?.exito || '');
  const [advertencias, setAdvertencias] = useState(ubicacion.state?.advertencias || []);
  const [error, setError] = useState('');
  const { datos, cargando, error: errorCarga, recargar } = useCarga(
    () => api.get(`/api/rutas${query(filtros)}`),
    [filtros.q, filtros.estado, filtros.tipo_servicio],
  );

  const alternar = async (r) => {
    setError('');
    try {
      let resultado;
      if (r.estado === 'ACTIVA') {
        const motivo = window.prompt(`Motivo de la suspensión de "${r.nombre}":`);
        if (motivo === null) return;
        resultado = await api.patch(`/api/rutas/${r.id}/suspender`, { motivo });
      } else {
        resultado = await api.patch(`/api/rutas/${r.id}/activar`);
      }
      setExito(`Ruta ${r.estado === 'ACTIVA' ? 'suspendida' : 'activada'}.`);
      setAdvertencias(resultado.advertencias || []);
      recargar();
    } catch (e) {
      setError(e.campos?.motivo || e.message);
    }
  };

  return (
    <>
      <EncabezadoPagina titulo="Rutas" descripcion="Recorridos de recolección, barrios que atienden y estado.">
        <Link to="/rutas/nueva" className="boton boton--primario">+ Nueva ruta</Link>
      </EncabezadoPagina>
      <Aviso tipo="exito" onCerrar={() => setExito('')}>{exito}</Aviso>
      <Advertencias lista={advertencias} onCerrar={() => setAdvertencias([])} />
      <Aviso tipo="error" onCerrar={() => setError('')}>{error || errorCarga?.message}</Aviso>

      <section className="tarjeta">
        <div className="filtros">
          <label className="filtros__busqueda">
            Buscar
            <input type="search" placeholder="Nombre o descripción" value={filtros.q} onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))} />
          </label>
          <label>
            Estado
            <select value={filtros.estado} onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}>
              <option value="">Todos</option>
              {opciones(ESTADOS_RUTA).map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </label>
          <label>
            Tipo de servicio
            <select value={filtros.tipo_servicio} onChange={(e) => setFiltros((f) => ({ ...f, tipo_servicio: e.target.value }))}>
              <option value="">Todos</option>
              {opciones(TIPOS_SERVICIO).map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </label>
        </div>

        {cargando && !datos ? <Cargando /> : !datos?.datos.length ? <Vacio>No hay rutas con esos filtros.</Vacio> : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead><tr><th>Ruta</th><th>Servicio</th><th>Barrios</th><th>Trazado</th><th>Programaciones</th><th>Estado</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {datos.datos.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/rutas/${r.id}`}><strong>{r.nombre}</strong></Link>
                      <div className="texto-suave">{r.descripcion}</div>
                      {r.estado === 'SUSPENDIDA' && r.motivo_suspension && <div className="texto-alerta">Motivo: {r.motivo_suspension}</div>}
                    </td>
                    <td>{TIPOS_SERVICIO[r.tipo_servicio]}</td>
                    <td>{r.barrios.length ? r.barrios.map((b) => b.nombre).join(', ') : '—'}</td>
                    <td>{r.tiene_trazado ? `${r.total_puntos} puntos · ${distanciaTexto(r.distancia_m)}` : <Insignia tono="alerta">Sin trazado</Insignia>}</td>
                    <td>{r.programaciones_activas}</td>
                    <td><EstadoInsignia mapa={ESTADOS_RUTA} valor={r.estado} /></td>
                    <td className="tabla__acciones">
                      <Link to={`/rutas/${r.id}`} className="boton boton--claro boton--chico">Ver / editar</Link>
                      <button type="button" className={`boton boton--chico ${r.estado === 'ACTIVA' ? 'boton--peligro' : 'boton--claro'}`} onClick={() => alternar(r)}>
                        {r.estado === 'ACTIVA' ? 'Suspender' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
