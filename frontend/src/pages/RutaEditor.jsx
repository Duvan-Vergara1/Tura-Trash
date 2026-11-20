// Crear o editar una ruta: datos generales, barrios y trazado en el mapa.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/cliente';
import MapaRuta from '../components/MapaRuta';
import { Aviso, Campo, Cargando, EncabezadoPagina, EstadoInsignia, useCarga, useFormulario } from '../components/UI';
import { ESTADOS_RUTA, TIPOS_SERVICIO, distanciaTexto, opciones } from '../utils/formato';

const VACIA = { nombre: '', descripcion: '', tipo_servicio: 'ORDINARIO', estado: 'ACTIVA', motivo_suspension: '', barrio_ids: [], puntos: [] };

export default function RutaEditor() {
  const { id } = useParams();
  const esNueva = !id;
  const navegar = useNavigate();
  const barrios = useCarga(() => api.get('/api/barrios?activo=true'), []);
  const ruta = useCarga(() => (esNueva ? Promise.resolve(null) : api.get(`/api/rutas/${id}`)), [id]);
  const f = useFormulario(VACIA);
  const [hidratado, setHidratado] = useState(esNueva);

  useEffect(() => {
    if (ruta.datos) {
      const r = ruta.datos;
      f.setValores({
        nombre: r.nombre,
        descripcion: r.descripcion,
        tipo_servicio: r.tipo_servicio,
        estado: r.estado,
        motivo_suspension: r.motivo_suspension || '',
        barrio_ids: r.barrios.map((b) => b.id),
        puntos: r.puntos.map(({ latitud, longitud }) => ({ latitud, longitud })),
      });
      setHidratado(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta.datos]);

  const alternarBarrio = (barrioId) => {
    f.setValores((v) => ({
      ...v,
      barrio_ids: v.barrio_ids.includes(barrioId) ? v.barrio_ids.filter((b) => b !== barrioId) : [...v.barrio_ids, barrioId],
    }));
  };

  const guardar = (e) => {
    e.preventDefault();
    f.enviar(async (v) => {
      if (v.puntos.length === 1) {
        const error = new Error('El trazado necesita al menos 2 puntos: el inicio y el final.');
        error.campos = { puntos: error.message };
        throw error;
      }
      const cuerpo = { ...v };
      const r = esNueva ? await api.post('/api/rutas', cuerpo) : await api.put(`/api/rutas/${id}`, cuerpo);
      navegar('/rutas', {
        state: { exito: esNueva ? `Ruta "${r.nombre}" creada.` : `Ruta "${r.nombre}" actualizada.`, advertencias: r.advertencias || [] },
      });
    });
  };

  if (!esNueva && ruta.cargando && !ruta.datos) return <Cargando texto="Cargando ruta…" />;
  if (ruta.error) return <Aviso tipo="error">{ruta.error.message}</Aviso>;

  const errorPuntos = f.errores.puntos || Object.entries(f.errores).find(([k]) => k.startsWith('puntos.'))?.[1];

  return (
    <>
      <EncabezadoPagina
        titulo={esNueva ? 'Nueva ruta' : f.valores.nombre || 'Ruta'}
        descripcion={esNueva ? 'Completa los datos y dibuja el recorrido en el mapa.' : `Distancia: ${distanciaTexto(ruta.datos?.distancia_m)}`}
      >
        {!esNueva && <EstadoInsignia mapa={ESTADOS_RUTA} valor={ruta.datos.estado} />}
        <Link to="/rutas" className="boton boton--claro">Volver</Link>
      </EncabezadoPagina>

      <form onSubmit={guardar} noValidate>
        <Aviso tipo="error">{f.mensaje}</Aviso>
        <div className="editor-ruta">
          <section className="tarjeta">
            <Campo etiqueta="Nombre *" error={f.errores.nombre}>
              <input value={f.valores.nombre} onChange={f.cambiar('nombre')} maxLength={120} />
            </Campo>
            <Campo etiqueta="Descripción *" error={f.errores.descripcion}>
              <textarea rows={3} value={f.valores.descripcion} onChange={f.cambiar('descripcion')} maxLength={1000} />
            </Campo>
            <Campo etiqueta="Tipo de servicio *" error={f.errores.tipo_servicio}>
              <select value={f.valores.tipo_servicio} onChange={f.cambiar('tipo_servicio')}>
                {opciones(TIPOS_SERVICIO).map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Estado *" error={f.errores.estado}>
              <div className="segmentado">
                {opciones(ESTADOS_RUTA).map((o) => (
                  <button type="button" key={o.valor} className={f.valores.estado === o.valor ? 'activo' : ''} onClick={() => f.cambiar('estado')(o.valor)}>
                    {o.texto}
                  </button>
                ))}
              </div>
            </Campo>
            {f.valores.estado === 'SUSPENDIDA' && (
              <Campo etiqueta="Motivo de la suspensión *" error={f.errores.motivo_suspension}>
                <input value={f.valores.motivo_suspension} onChange={f.cambiar('motivo_suspension')} maxLength={500} />
              </Campo>
            )}
            <Campo etiqueta="Barrios que atiende" error={f.errores.barrio_ids}>
              {barrios.cargando ? <Cargando /> : (
                <div className="casillas">
                  {(barrios.datos?.datos || []).map((b) => (
                    <label key={b.id}>
                      <input type="checkbox" checked={f.valores.barrio_ids.includes(b.id)} onChange={() => alternarBarrio(b.id)} />
                      {b.nombre}
                    </label>
                  ))}
                  {!barrios.datos?.datos.length && <span className="texto-suave">Primero registra barrios en el módulo Barrios.</span>}
                </div>
              )}
            </Campo>
            <div className="acciones-formulario">
              <Link to="/rutas" className="boton boton--claro">Cancelar</Link>
              <button type="submit" className="boton boton--primario" disabled={f.guardando}>{f.guardando ? 'Guardando…' : 'Guardar ruta'}</button>
            </div>
          </section>

          <section className="tarjeta">
            <h2>Recorrido</h2>
            <p className="texto-suave">El punto verde es el inicio y el rojo el final. El recorrido se guarda en ese orden.</p>
            {errorPuntos && <Aviso tipo="error">{errorPuntos}</Aviso>}
            {hidratado && <MapaRuta editable puntos={f.valores.puntos} onCambiar={(puntos) => f.setValores((v) => ({ ...v, puntos }))} alto={520} />}
          </section>
        </div>
      </form>
    </>
  );
}
