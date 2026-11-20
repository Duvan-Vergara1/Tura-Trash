import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, query } from '../api/cliente';
import MapaRuta from '../components/MapaRuta';
import { Aviso, Cargando, EncabezadoPagina, EstadoInsignia, Modal, Vacio, useCarga } from '../components/UI';
import { ESTADOS_SERVICIO, fechaLarga, hoy, opciones } from '../utils/formato';

const ICONOS = { vehiculos: '🚛', conductores: '👷', rutas: '🗺', programacion: '📅' };

function Indicador({ titulo, valor, detalle, tono }) {
  return (
    <div className={`indicador ${tono ? `indicador--${tono}` : ''}`}>
      <span className="indicador__titulo">{titulo}</span>
      <strong className="indicador__valor">{valor ?? '—'}</strong>
      {detalle && <span className="indicador__detalle">{detalle}</span>}
    </div>
  );
}

function ServiciosDelDia({ rutas, conductores, vehiculos }) {
  const [filtros, setFiltros] = useState({ fecha: hoy(), ruta_id: '', conductor_id: '', vehiculo_id: '', estado: '' });
  const [mapa, setMapa] = useState(null);
  const [error, setError] = useState('');
  const { datos, cargando, error: errorCarga, recargar } = useCarga(
    () => api.get(`/api/servicios${query(filtros)}`),
    [filtros.fecha, filtros.ruta_id, filtros.conductor_id, filtros.vehiculo_id, filtros.estado],
  );

  const cambiarFiltro = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));

  const verMapa = async (servicio) => {
    setError('');
    try {
      const ruta = await api.get(`/api/rutas/${servicio.ruta_id}`);
      setMapa({ servicio, ruta });
    } catch (e) {
      setError(e.message);
    }
  };

  const cambiarEstado = async (servicio, estado) => {
    setError('');
    try {
      await api.put(`/api/servicios/${servicio.programacion_id}/${servicio.fecha}`, { estado, observaciones: servicio.observaciones });
      recargar();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section className="tarjeta">
      <div className="tarjeta__cabecera">
        <div>
          <h2>Programación y servicios del día</h2>
          <p className="texto-suave">{fechaLarga(filtros.fecha)}</p>
        </div>
        <Link to="/programacion" className="boton boton--claro boton--chico">
          Gestionar programación
        </Link>
      </div>

      <div className="filtros">
        <label>
          Fecha
          <input type="date" value={filtros.fecha} onChange={cambiarFiltro('fecha')} />
        </label>
        <label>
          Ruta
          <select value={filtros.ruta_id} onChange={cambiarFiltro('ruta_id')}>
            <option value="">Todas</option>
            {rutas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Conductor
          <select value={filtros.conductor_id} onChange={cambiarFiltro('conductor_id')}>
            <option value="">Todos</option>
            {conductores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombres} {c.apellidos}
              </option>
            ))}
          </select>
        </label>
        <label>
          Vehículo
          <select value={filtros.vehiculo_id} onChange={cambiarFiltro('vehiculo_id')}>
            <option value="">Todos</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select value={filtros.estado} onChange={cambiarFiltro('estado')}>
            <option value="">Todos</option>
            {opciones(ESTADOS_SERVICIO).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.texto}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Aviso tipo="error" onCerrar={() => setError('')}>
        {error || errorCarga?.message}
      </Aviso>

      {cargando && !datos ? (
        <Cargando />
      ) : !datos?.datos.length ? (
        <Vacio>No hay servicios programados para este día con esos filtros.</Vacio>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Horario</th>
                <th>Ruta</th>
                <th>Conductor</th>
                <th>Vehículo</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {datos.datos.map((s) => (
                <tr key={s.programacion_id}>
                  <td>
                    <strong>
                      {s.hora_inicio} – {s.hora_fin}
                    </strong>
                    <div className="texto-suave">{s.turno_nombre}</div>
                  </td>
                  <td>
                    {s.ruta_nombre}
                    {s.alertas.length > 0 && (
                      <div className="texto-alerta" title={s.alertas.join(' ')}>
                        ⚠ {s.alertas.join(' ')}
                      </div>
                    )}
                  </td>
                  <td>{s.conductor_nombre}</td>
                  <td>
                    <span className="placa">{s.vehiculo_placa}</span>
                  </td>
                  <td>
                    <select
                      className={`selector-estado selector-estado--${ESTADOS_SERVICIO[s.estado].tono}`}
                      value={s.estado}
                      onChange={(e) => cambiarEstado(s, e.target.value)}
                      aria-label={`Estado del servicio de ${s.ruta_nombre}`}
                    >
                      {opciones(ESTADOS_SERVICIO).map((o) => (
                        <option key={o.valor} value={o.valor}>
                          {o.texto}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="tabla__acciones">
                    <button type="button" className="boton boton--claro boton--chico" onClick={() => verMapa(s)}>
                      Ver mapa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal abierto={Boolean(mapa)} onCerrar={() => setMapa(null)} titulo={mapa ? `Recorrido · ${mapa.ruta.nombre}` : ''} ancho="ancho">
        {mapa && (
          <>
            <p className="texto-suave">
              {mapa.servicio.turno_nombre} ({mapa.servicio.hora_inicio} – {mapa.servicio.hora_fin}) · {mapa.servicio.conductor_nombre} ·{' '}
              {mapa.servicio.vehiculo_placa} · <EstadoInsignia mapa={ESTADOS_SERVICIO} valor={mapa.servicio.estado} />
            </p>
            <MapaRuta puntos={mapa.ruta.puntos} alto={440} />
          </>
        )}
      </Modal>
    </section>
  );
}

export default function Dashboard() {
  const panel = useCarga(() => api.get('/api/dashboard'), []);
  const listas = useCarga(
    () =>
      Promise.all([api.get('/api/rutas'), api.get('/api/conductores'), api.get('/api/vehiculos')]).then(([r, c, v]) => ({
        rutas: r.datos,
        conductores: c.datos,
        vehiculos: v.datos,
      })),
    [],
  );

  if (panel.cargando && !panel.datos) return <Cargando texto="Cargando el panel…" />;
  if (panel.error) return <Aviso tipo="error">{panel.error.message}</Aviso>;

  const { usuario, modulos, indicadores: i } = panel.datos;

  return (
    <>
      <EncabezadoPagina titulo={`Hola, ${usuario.nombre.split(' ')[0]}`} descripcion="Resumen de la operación de recolección en Buenaventura.">
        <button type="button" className="boton boton--claro" onClick={panel.recargar}>
          Actualizar
        </button>
      </EncabezadoPagina>

      <section className="modulos" aria-label="Módulos">
        {modulos.map((m) => (
          <Link key={m.clave} to={m.ruta} className="modulo">
            <span className="modulo__icono" aria-hidden="true">
              {ICONOS[m.clave]}
            </span>
            <strong>{m.nombre}</strong>
            <span>{m.descripcion}</span>
          </Link>
        ))}
      </section>

      <section className="grupo-indicadores" aria-label="Indicadores">
        <h2 className="grupo-indicadores__titulo">Vehículos</h2>
        <div className="indicadores">
          <Indicador titulo="Total" valor={i.vehiculos.total} detalle={`${i.vehiculos.inactivos} desactivados`} />
          <Indicador titulo="Disponibles" valor={i.vehiculos.disponibles} tono="ok" />
          <Indicador titulo="En servicio" valor={i.vehiculos.en_servicio} tono="info" />
          <Indicador titulo="En mantenimiento" valor={i.vehiculos.mantenimiento} tono="alerta" />
        </div>

        <h2 className="grupo-indicadores__titulo">Conductores</h2>
        <div className="indicadores">
          <Indicador titulo="Total" valor={i.conductores.total} detalle={`${i.conductores.inactivos} inactivos`} />
          <Indicador titulo="Activos" valor={i.conductores.activos} tono="ok" />
          <Indicador titulo="Licencias vencidas" valor={i.conductores.licencias_vencidas} tono={i.conductores.licencias_vencidas ? 'peligro' : undefined} />
          <Indicador titulo="Vencen en 30 días" valor={i.conductores.licencias_por_vencer} tono={i.conductores.licencias_por_vencer ? 'alerta' : undefined} />
        </div>

        <h2 className="grupo-indicadores__titulo">Rutas y programación</h2>
        <div className="indicadores">
          <Indicador titulo="Rutas" valor={i.rutas.total} detalle={`${i.rutas.sin_trazado} sin trazado`} />
          <Indicador titulo="Rutas activas" valor={i.rutas.activas} tono="ok" />
          <Indicador titulo="Rutas suspendidas" valor={i.rutas.suspendidas} tono={i.rutas.suspendidas ? 'peligro' : undefined} />
          <Indicador titulo="Rutas programadas" valor={i.programacion.rutas_programadas} tono="info" detalle={`${i.programacion.activas} programaciones activas`} />
          <Indicador
            titulo="Servicios hoy"
            valor={i.servicios_hoy.total}
            detalle={`${i.servicios_hoy.COMPLETADO} completados · ${i.servicios_hoy.EN_CURSO} en curso`}
            tono={i.servicios_hoy.con_alertas ? 'alerta' : undefined}
          />
        </div>
      </section>

      <ServiciosDelDia rutas={listas.datos?.rutas || []} conductores={listas.datos?.conductores || []} vehiculos={listas.datos?.vehiculos || []} />
    </>
  );
}
