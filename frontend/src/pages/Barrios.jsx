import { useState } from 'react';
import { api, query } from '../api/cliente';
import { Aviso, Campo, Cargando, EncabezadoPagina, Insignia, Modal, Vacio, useCarga, useFormulario } from '../components/UI';

const VACIO = { nombre: '', comuna: '', zona: 'URBANA', descripcion: '' };

function FormularioBarrio({ inicial, onGuardado, onCancelar }) {
  const f = useFormulario(
    inicial ? { nombre: inicial.nombre, comuna: inicial.comuna ?? '', zona: inicial.zona, descripcion: inicial.descripcion ?? '' } : VACIO,
  );
  const guardar = (e) => {
    e.preventDefault();
    f.enviar(async (v) => {
      const r = inicial ? await api.put(`/api/barrios/${inicial.id}`, v) : await api.post('/api/barrios', v);
      onGuardado(r, inicial ? 'Barrio actualizado.' : 'Barrio registrado.');
    });
  };
  return (
    <form onSubmit={guardar} noValidate>
      <Aviso tipo="error">{f.mensaje}</Aviso>
      <Campo etiqueta="Nombre del barrio o sector *" error={f.errores.nombre}>
        <input value={f.valores.nombre} onChange={f.cambiar('nombre')} maxLength={100} autoFocus />
      </Campo>
      <div className="rejilla-formulario">
        <Campo etiqueta="Zona" error={f.errores.zona}>
          <select value={f.valores.zona} onChange={f.cambiar('zona')}>
            <option value="URBANA">Urbana</option>
            <option value="RURAL">Rural</option>
          </select>
        </Campo>
        <Campo etiqueta="Comuna (1 a 12)" error={f.errores.comuna}>
          <input type="number" min={1} max={12} value={f.valores.comuna} onChange={f.cambiar('comuna')} />
        </Campo>
      </div>
      <Campo etiqueta="Descripción" error={f.errores.descripcion}>
        <textarea rows={2} value={f.valores.descripcion} onChange={f.cambiar('descripcion')} maxLength={500} />
      </Campo>
      <div className="acciones-formulario">
        <button type="button" className="boton boton--claro" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton boton--primario" disabled={f.guardando}>{f.guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}

export default function Barrios() {
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const [exito, setExito] = useState('');
  const [error, setError] = useState('');
  const { datos, cargando, error: errorCarga, recargar } = useCarga(() => api.get(`/api/barrios${query({ q })}`), [q]);

  const alternar = async (b) => {
    setError('');
    try {
      await api.patch(`/api/barrios/${b.id}/${b.activo ? 'desactivar' : 'activar'}`);
      setExito(`Barrio ${b.activo ? 'desactivado' : 'activado'}.`);
      recargar();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <EncabezadoPagina titulo="Barrios y sectores" descripcion="Zonas de Buenaventura que atienden las rutas.">
        <button type="button" className="boton boton--primario" onClick={() => setModal({})}>+ Nuevo barrio</button>
      </EncabezadoPagina>
      <Aviso tipo="exito" onCerrar={() => setExito('')}>{exito}</Aviso>
      <Aviso tipo="error" onCerrar={() => setError('')}>{error || errorCarga?.message}</Aviso>

      <section className="tarjeta">
        <div className="filtros">
          <label className="filtros__busqueda">
            Buscar
            <input type="search" placeholder="Nombre del barrio" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        {cargando && !datos ? <Cargando /> : !datos?.datos.length ? <Vacio>No hay barrios registrados.</Vacio> : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead><tr><th>Nombre</th><th>Zona</th><th>Comuna</th><th>Rutas</th><th>Estado</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {datos.datos.map((b) => (
                  <tr key={b.id} className={b.activo ? '' : 'fila-apagada'}>
                    <td><strong>{b.nombre}</strong>{b.descripcion && <div className="texto-suave">{b.descripcion}</div>}</td>
                    <td>{b.zona === 'URBANA' ? 'Urbana' : 'Rural'}</td>
                    <td>{b.comuna ?? '—'}</td>
                    <td>{b.total_rutas}</td>
                    <td>{b.activo ? <Insignia tono="ok">Activo</Insignia> : <Insignia>Inactivo</Insignia>}</td>
                    <td className="tabla__acciones">
                      <button type="button" className="boton boton--claro boton--chico" onClick={() => setModal({ barrio: b })}>Editar</button>
                      <button type="button" className={`boton boton--chico ${b.activo ? 'boton--peligro' : 'boton--claro'}`} onClick={() => alternar(b)}>
                        {b.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal abierto={Boolean(modal)} onCerrar={() => setModal(null)} titulo={modal?.barrio ? 'Editar barrio' : 'Nuevo barrio'}>
        {modal && (
          <FormularioBarrio
            inicial={modal.barrio}
            onCancelar={() => setModal(null)}
            onGuardado={(_, mensaje) => { setModal(null); setExito(mensaje); recargar(); }}
          />
        )}
      </Modal>
    </>
  );
}
