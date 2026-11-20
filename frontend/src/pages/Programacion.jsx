// Programación del servicio: ruta + vehículo + conductor + turno + fechas + días.
// El formulario consulta /api/programaciones/validar mientras se llena para
// advertir conflictos y reglas antes de guardar.
import { useEffect, useMemo, useState } from 'react';
import { api, query } from '../api/cliente';
import MapaRuta from '../components/MapaRuta';
import {
  Advertencias, Aviso, Campo, Cargando, EncabezadoPagina, EstadoInsignia, Modal, Vacio, useCarga, useFormulario,
} from '../components/UI';
import { DIAS, ESTADOS_PROGRAMACION, diasTexto, fechaCorta, hoy, opciones } from '../utils/formato';

function useCatalogos() {
  return useCarga(
    () =>
      Promise.all([api.get('/api/rutas'), api.get('/api/vehiculos'), api.get('/api/conductores'), api.get('/api/turnos')]).then(
        ([rutas, vehiculos, conductores, turnos]) => ({
          rutas: rutas.datos,
          vehiculos: vehiculos.datos,
          conductores: conductores.datos,
          turnos: turnos.datos,
        }),
      ),
    [],
  );
}

function FormularioProgramacion({ inicial, catalogos, onGuardado, onCancelar }) {
  const f = useFormulario(
    inicial
      ? {
          ruta_id: String(inicial.ruta_id), vehiculo_id: String(inicial.vehiculo_id), conductor_id: String(inicial.conductor_id),
          turno_id: String(inicial.turno_id), fecha_inicio: inicial.fecha_inicio, fecha_fin: inicial.fecha_fin || '',
          dias_semana: inicial.dias_semana, observaciones: inicial.observaciones || '',
        }
      : { ruta_id: '', vehiculo_id: '', conductor_id: '', turno_id: '', fecha_inicio: hoy(), fecha_fin: '', dias_semana: [1, 2, 3, 4, 5, 6], observaciones: '' },
  );
  const [revision, setRevision] = useState(null);

  // Revisión en vivo: cuando están los datos clave, pregunta al backend.
  const v = f.valores;
  const completo = v.ruta_id && v.vehiculo_id && v.conductor_id && v.turno_id && v.fecha_inicio && v.dias_semana.length;
  useEffect(() => {
    if (!completo) {
      setRevision(null);
      return undefined;
    }
    const temporizador = setTimeout(async () => {
      try {
        const r = await api.post(`/api/programaciones/validar${query({ excluir_id: inicial?.id })}`, v);
        setRevision(r);
      } catch {
        setRevision(null); // Los errores de formato se muestran al guardar.
      }
    }, 350);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completo, v.ruta_id, v.vehiculo_id, v.conductor_id, v.turno_id, v.fecha_inicio, v.fecha_fin, v.dias_semana.join(',')]);

  const alternarDia = (dia) =>
    f.setValores((x) => ({ ...x, dias_semana: x.dias_semana.includes(dia) ? x.dias_semana.filter((d) => d !== dia) : [...x.dias_semana, dia].sort() }));

  const guardar = (e) => {
    e.preventDefault();
    f.enviar(async (valores) => {
      const r = inicial ? await api.put(`/api/programaciones/${inicial.id}`, valores) : await api.post('/api/programaciones', valores);
      onGuardado(r, inicial ? 'Programación actualizada.' : 'Programación creada.');
    });
  };

  const erroresRevision = Object.fromEntries((revision?.errores || []).map((e) => [e.campo, e.mensaje]));
  const error = (campo) => f.errores[campo] || erroresRevision[campo];

  // Solo se ofrecen recursos que se pueden asignar (más el ya asignado al editar).
  const rutas = catalogos.rutas.filter((r) => (r.estado === 'ACTIVA' && r.tiene_trazado) || String(r.id) === v.ruta_id);
  const vehiculos = catalogos.vehiculos.filter((x) => (x.activo && ['DISPONIBLE', 'EN_SERVICIO'].includes(x.estado_operativo)) || String(x.id) === v.vehiculo_id);
  const conductores = catalogos.conductores.filter((c) => (c.estado === 'ACTIVO' && !c.licencia_vencida) || String(c.id) === v.conductor_id);
  const turnos = catalogos.turnos.filter((t) => t.activo || String(t.id) === v.turno_id);
  const ocultos = catalogos.rutas.length - rutas.length + catalogos.vehiculos.length - vehiculos.length + catalogos.conductores.length - conductores.length;

  return (
    <form onSubmit={guardar} noValidate>
      <Aviso tipo="error">{f.mensaje}</Aviso>
      <div className="rejilla-formulario">
        <Campo etiqueta="Ruta *" error={error('ruta_id')}>
          <select value={v.ruta_id} onChange={f.cambiar('ruta_id')}>
            <option value="">Selecciona…</option>
            {rutas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Turno *" error={error('turno_id')}>
          <select value={v.turno_id} onChange={f.cambiar('turno_id')}>
            <option value="">Selecciona…</option>
            {turnos.map((t) => <option key={t.id} value={t.id}>{t.nombre} ({t.hora_inicio} – {t.hora_fin})</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Vehículo *" error={error('vehiculo_id')}>
          <select value={v.vehiculo_id} onChange={f.cambiar('vehiculo_id')}>
            <option value="">Selecciona…</option>
            {vehiculos.map((x) => <option key={x.id} value={x.id}>{x.placa} · {x.marca} {x.modelo}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Conductor *" error={error('conductor_id')}>
          <select value={v.conductor_id} onChange={f.cambiar('conductor_id')}>
            <option value="">Selecciona…</option>
            {conductores.map((c) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos} · {c.licencia_categoria}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Fecha de inicio *" error={error('fecha_inicio')}>
          <input type="date" value={v.fecha_inicio} onChange={f.cambiar('fecha_inicio')} />
        </Campo>
        <Campo etiqueta="Fecha de finalización" error={error('fecha_fin')} ayuda="Vacía = sin fecha de fin">
          <input type="date" value={v.fecha_fin} onChange={f.cambiar('fecha_fin')} min={v.fecha_inicio} />
        </Campo>
        <Campo etiqueta="Días de la semana *" error={error('dias_semana')} ancho="completo">
          <div className="segmentado">
            {DIAS.map((d) => (
              <button type="button" key={d.valor} className={v.dias_semana.includes(d.valor) ? 'activo' : ''} onClick={() => alternarDia(d.valor)} title={d.largo}>
                {d.corto}
              </button>
            ))}
          </div>
        </Campo>
        <Campo etiqueta="Observaciones" error={error('observaciones')} ancho="completo">
          <textarea rows={2} value={v.observaciones} onChange={f.cambiar('observaciones')} maxLength={500} />
        </Campo>
      </div>

      {ocultos > 0 && (
        <p className="texto-suave">
          No se muestran {ocultos} recurso(s) que no se pueden asignar (rutas suspendidas o sin trazado, vehículos inactivos o en
          mantenimiento, conductores inactivos o con la licencia vencida).
        </p>
      )}

      {revision?.conflictos?.length > 0 && (
        <Aviso tipo="error">
          <strong>Conflictos de horario:</strong>
          <ul className="lista-simple">{revision.conflictos.map((c) => <li key={`${c.tipo}-${c.programacion_id}`}>{c.mensaje}</li>)}</ul>
        </Aviso>
      )}
      <Advertencias lista={revision?.advertencias} />
      {revision?.valido && <Aviso tipo="exito">Sin conflictos: el vehículo y el conductor están libres en ese horario.</Aviso>}

      <div className="acciones-formulario">
        <button type="button" className="boton boton--claro" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton boton--primario" disabled={f.guardando}>{f.guardando ? 'Guardando…' : 'Guardar programación'}</button>
      </div>
    </form>
  );
}

export default function Programacion() {
  const catalogos = useCatalogos();
  const [filtros, setFiltros] = useState({ estado: 'ACTIVA', ruta_id: '', vehiculo_id: '', conductor_id: '', fecha: '' });
  const [modal, setModal] = useState(null);
  const [mapa, setMapa] = useState(null);
  const [exito, setExito] = useState('');
  const [advertencias, setAdvertencias] = useState([]);
  const [error, setError] = useState('');
  const { datos, cargando, error: errorCarga, recargar } = useCarga(
    () => api.get(`/api/programaciones${query(filtros)}`),
    [filtros.estado, filtros.ruta_id, filtros.vehiculo_id, filtros.conductor_id, filtros.fecha],
  );
  const cambiarFiltro = (campo) => (e) => setFiltros((x) => ({ ...x, [campo]: e.target.value }));

  const accion = async (p, tipo) => {
    setError('');
    try {
      if (tipo === 'cancelar') {
        const motivo = window.prompt('Motivo de la cancelación:');
        if (motivo === null) return;
        await api.patch(`/api/programaciones/${p.id}/cancelar`, { motivo });
      } else {
        const r = await api.patch(`/api/programaciones/${p.id}/${tipo}`);
        setAdvertencias(r.advertencias || []);
      }
      setExito({ cancelar: 'Programación cancelada.', desactivar: 'Programación desactivada.', activar: 'Programación reactivada.' }[tipo]);
      recargar();
    } catch (e) {
      setError(e.campos?.motivo || e.message);
    }
  };

  const verMapa = async (p) => {
    try {
      setMapa({ p, ruta: await api.get(`/api/rutas/${p.ruta_id}`) });
    } catch (e) {
      setError(e.message);
    }
  };

  const listas = catalogos.datos;
  const titulo = useMemo(() => (modal?.p ? 'Editar programación' : 'Nueva programación'), [modal]);

  return (
    <>
      <EncabezadoPagina titulo="Programación del servicio" descripcion="Asigna ruta, vehículo, conductor y turno por días de la semana.">
        <button type="button" className="boton boton--primario" onClick={() => setModal({})} disabled={!listas}>+ Programar ruta</button>
      </EncabezadoPagina>
      <Aviso tipo="exito" onCerrar={() => setExito('')}>{exito}</Aviso>
      <Advertencias lista={advertencias} onCerrar={() => setAdvertencias([])} />
      <Aviso tipo="error" onCerrar={() => setError('')}>{error || errorCarga?.message || catalogos.error?.message}</Aviso>

      <section className="tarjeta">
        <div className="filtros">
          <label>
            Estado
            <select value={filtros.estado} onChange={cambiarFiltro('estado')}>
              <option value="">Todos</option>
              {opciones(ESTADOS_PROGRAMACION).map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </label>
          <label>
            Vigente el día
            <input type="date" value={filtros.fecha} onChange={cambiarFiltro('fecha')} />
          </label>
          <label>
            Ruta
            <select value={filtros.ruta_id} onChange={cambiarFiltro('ruta_id')}>
              <option value="">Todas</option>
              {listas?.rutas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </label>
          <label>
            Conductor
            <select value={filtros.conductor_id} onChange={cambiarFiltro('conductor_id')}>
              <option value="">Todos</option>
              {listas?.conductores.map((c) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
            </select>
          </label>
          <label>
            Vehículo
            <select value={filtros.vehiculo_id} onChange={cambiarFiltro('vehiculo_id')}>
              <option value="">Todos</option>
              {listas?.vehiculos.map((x) => <option key={x.id} value={x.id}>{x.placa}</option>)}
            </select>
          </label>
        </div>

        {cargando && !datos ? <Cargando /> : !datos?.datos.length ? <Vacio>No hay programaciones con esos filtros.</Vacio> : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead><tr><th>Ruta</th><th>Conductor</th><th>Vehículo</th><th>Horario</th><th>Días y vigencia</th><th>Estado</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {datos.datos.map((p) => (
                  <tr key={p.id} className={p.estado === 'ACTIVA' ? '' : 'fila-apagada'}>
                    <td><strong>{p.ruta_nombre}</strong>{p.observaciones && <div className="texto-suave">{p.observaciones}</div>}</td>
                    <td>{p.conductor_nombre}</td>
                    <td><span className="placa">{p.vehiculo_placa}</span></td>
                    <td>{p.turno_nombre}<div className="texto-suave">{p.hora_inicio} – {p.hora_fin}</div></td>
                    <td>{diasTexto(p.dias_semana)}<div className="texto-suave">Desde {fechaCorta(p.fecha_inicio)}{p.fecha_fin ? ` hasta ${fechaCorta(p.fecha_fin)}` : ''}</div></td>
                    <td>
                      <EstadoInsignia mapa={ESTADOS_PROGRAMACION} valor={p.estado} />
                      {p.motivo_cancelacion && <div className="texto-suave">{p.motivo_cancelacion}</div>}
                    </td>
                    <td className="tabla__acciones">
                      <button type="button" className="boton boton--claro boton--chico" onClick={() => verMapa(p)}>Mapa</button>
                      {p.estado !== 'CANCELADA' && <button type="button" className="boton boton--claro boton--chico" onClick={() => setModal({ p })}>Editar</button>}
                      {p.estado === 'ACTIVA' && <button type="button" className="boton boton--claro boton--chico" onClick={() => accion(p, 'desactivar')}>Desactivar</button>}
                      {p.estado === 'INACTIVA' && <button type="button" className="boton boton--claro boton--chico" onClick={() => accion(p, 'activar')}>Reactivar</button>}
                      {p.estado !== 'CANCELADA' && <button type="button" className="boton boton--peligro boton--chico" onClick={() => accion(p, 'cancelar')}>Cancelar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal abierto={Boolean(modal)} onCerrar={() => setModal(null)} titulo={titulo} ancho="ancho">
        {modal && listas && (
          <FormularioProgramacion
            inicial={modal.p}
            catalogos={listas}
            onCancelar={() => setModal(null)}
            onGuardado={(r, m) => { setModal(null); setExito(m); setAdvertencias(r.advertencias || []); recargar(); }}
          />
        )}
      </Modal>

      <Modal abierto={Boolean(mapa)} onCerrar={() => setMapa(null)} titulo={mapa ? `Recorrido · ${mapa.ruta.nombre}` : ''} ancho="ancho">
        {mapa && <MapaRuta puntos={mapa.ruta.puntos} alto={440} />}
      </Modal>
    </>
  );
}
