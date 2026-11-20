import { useState } from 'react';
import { api, query } from '../api/cliente';
import {
  Advertencias, Aviso, Campo, Cargando, EncabezadoPagina, EstadoInsignia, Insignia, Modal, Vacio, useCarga, useFormulario,
} from '../components/UI';
import { CATEGORIAS_LICENCIA, ESTADOS_CONDUCTOR, TIPOS_DOCUMENTO, fechaCorta, opciones } from '../utils/formato';

const VACIO = {
  nombres: '', apellidos: '', tipo_documento: 'CC', numero_documento: '', telefono: '', email: '',
  licencia_numero: '', licencia_categoria: 'C2', licencia_vencimiento: '', estado: 'ACTIVO',
};
const CAMPOS = Object.keys(VACIO);

function FormularioConductor({ inicial, onGuardado, onCancelar }) {
  const f = useFormulario(
    inicial ? Object.fromEntries(CAMPOS.map((c) => [c, inicial[c] ?? ''])) : VACIO,
  );

  const guardar = (e) => {
    e.preventDefault();
    f.enviar(async (v) => {
      const cuerpo = Object.fromEntries(CAMPOS.map((c) => [c, v[c]]));
      const r = inicial ? await api.put(`/api/conductores/${inicial.id}`, cuerpo) : await api.post('/api/conductores', cuerpo);
      onGuardado(r, inicial ? 'Conductor actualizado.' : 'Conductor registrado.');
    });
  };

  return (
    <form onSubmit={guardar} noValidate>
      <Aviso tipo="error">{f.mensaje}</Aviso>
      <fieldset className="grupo-campos">
        <legend>Datos personales</legend>
        <div className="rejilla-formulario">
          <Campo etiqueta="Nombres *" error={f.errores.nombres}><input value={f.valores.nombres} onChange={f.cambiar('nombres')} maxLength={80} /></Campo>
          <Campo etiqueta="Apellidos *" error={f.errores.apellidos}><input value={f.valores.apellidos} onChange={f.cambiar('apellidos')} maxLength={80} /></Campo>
          <Campo etiqueta="Tipo de documento *" error={f.errores.tipo_documento}>
            <select value={f.valores.tipo_documento} onChange={f.cambiar('tipo_documento')}>
              {opciones(TIPOS_DOCUMENTO).map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Número de documento *" error={f.errores.numero_documento}>
            <input value={f.valores.numero_documento} onChange={f.cambiar('numero_documento')} maxLength={20} inputMode="numeric" />
          </Campo>
          <Campo etiqueta="Teléfono" error={f.errores.telefono}><input value={f.valores.telefono} onChange={f.cambiar('telefono')} maxLength={20} /></Campo>
          <Campo etiqueta="Correo" error={f.errores.email}><input type="email" value={f.valores.email} onChange={f.cambiar('email')} maxLength={160} /></Campo>
        </div>
      </fieldset>
      <fieldset className="grupo-campos">
        <legend>Licencia de conducción</legend>
        <div className="rejilla-formulario rejilla-formulario--3">
          <Campo etiqueta="Número *" error={f.errores.licencia_numero}><input value={f.valores.licencia_numero} onChange={f.cambiar('licencia_numero')} maxLength={20} className="mayusculas" /></Campo>
          <Campo etiqueta="Categoría *" error={f.errores.licencia_categoria}>
            <select value={f.valores.licencia_categoria} onChange={f.cambiar('licencia_categoria')}>
              {CATEGORIAS_LICENCIA.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Vence *" error={f.errores.licencia_vencimiento}><input type="date" value={f.valores.licencia_vencimiento} onChange={f.cambiar('licencia_vencimiento')} /></Campo>
        </div>
      </fieldset>
      <Campo etiqueta="Estado *" error={f.errores.estado}>
        <div className="segmentado">
          {opciones(ESTADOS_CONDUCTOR).map((o) => (
            <button type="button" key={o.valor} className={f.valores.estado === o.valor ? 'activo' : ''} onClick={() => f.cambiar('estado')(o.valor)}>{o.texto}</button>
          ))}
        </div>
      </Campo>
      <div className="acciones-formulario">
        <button type="button" className="boton boton--claro" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton boton--primario" disabled={f.guardando}>{f.guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}

function Detalle({ c }) {
  return (
    <dl className="detalle">
      <dt>Nombre</dt><dd>{c.nombres} {c.apellidos}</dd>
      <dt>Documento</dt><dd>{TIPOS_DOCUMENTO[c.tipo_documento]} · {c.numero_documento}</dd>
      <dt>Teléfono</dt><dd>{c.telefono || '—'}</dd>
      <dt>Correo</dt><dd>{c.email || '—'}</dd>
      <dt>Licencia</dt><dd>{c.licencia_numero} · Categoría {c.licencia_categoria}</dd>
      <dt>Vencimiento</dt><dd>{fechaCorta(c.licencia_vencimiento)} {c.licencia_vencida && <Insignia tono="peligro">Vencida</Insignia>}</dd>
      <dt>Estado</dt><dd><EstadoInsignia mapa={ESTADOS_CONDUCTOR} valor={c.estado} /></dd>
      <dt>Registrado</dt><dd>{fechaCorta(c.creado_en)}</dd>
    </dl>
  );
}

export default function Conductores() {
  const [filtros, setFiltros] = useState({ q: '', estado: '' });
  const [modal, setModal] = useState(null);
  const [exito, setExito] = useState('');
  const [advertencias, setAdvertencias] = useState([]);
  const [error, setError] = useState('');
  const { datos, cargando, error: errorCarga, recargar } = useCarga(() => api.get(`/api/conductores${query(filtros)}`), [filtros.q, filtros.estado]);

  const alGuardar = (c, mensaje) => {
    setModal(null);
    setExito(mensaje);
    setAdvertencias(c.advertencias || []);
    recargar();
  };

  const alternar = async (c) => {
    const desactivar = c.estado !== 'INACTIVO';
    if (desactivar && !window.confirm(`¿Desactivar a ${c.nombres} ${c.apellidos}? No podrá asignarse a nuevas programaciones.`)) return;
    setError('');
    try {
      const r = await api.patch(`/api/conductores/${c.id}/${desactivar ? 'desactivar' : 'activar'}`);
      setExito(`Conductor ${desactivar ? 'desactivado' : 'activado'}.`);
      setAdvertencias(r.advertencias || []);
      recargar();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <EncabezadoPagina titulo="Conductores" descripcion="Personal de conducción, licencias y estado.">
        <button type="button" className="boton boton--primario" onClick={() => setModal({ modo: 'nuevo' })}>+ Nuevo conductor</button>
      </EncabezadoPagina>
      <Aviso tipo="exito" onCerrar={() => setExito('')}>{exito}</Aviso>
      <Advertencias lista={advertencias} onCerrar={() => setAdvertencias([])} />
      <Aviso tipo="error" onCerrar={() => setError('')}>{error || errorCarga?.message}</Aviso>

      <section className="tarjeta">
        <div className="filtros">
          <label className="filtros__busqueda">
            Buscar
            <input type="search" placeholder="Nombre, documento o licencia" value={filtros.q} onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))} />
          </label>
          <label>
            Estado
            <select value={filtros.estado} onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}>
              <option value="">Todos</option>
              {opciones(ESTADOS_CONDUCTOR).map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </label>
        </div>

        {cargando && !datos ? <Cargando /> : !datos?.datos.length ? <Vacio>No hay conductores con esos filtros.</Vacio> : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead><tr><th>Nombre</th><th>Documento</th><th>Licencia</th><th>Vence</th><th>Estado</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {datos.datos.map((c) => (
                  <tr key={c.id} className={c.estado === 'INACTIVO' ? 'fila-apagada' : ''}>
                    <td><strong>{c.nombres} {c.apellidos}</strong><div className="texto-suave">{c.telefono || ''}</div></td>
                    <td>{c.tipo_documento} {c.numero_documento}</td>
                    <td>{c.licencia_numero} · <strong>{c.licencia_categoria}</strong></td>
                    <td>{fechaCorta(c.licencia_vencimiento)} {c.licencia_vencida && <Insignia tono="peligro">Vencida</Insignia>}</td>
                    <td><EstadoInsignia mapa={ESTADOS_CONDUCTOR} valor={c.estado} /></td>
                    <td className="tabla__acciones">
                      <button type="button" className="boton boton--claro boton--chico" onClick={() => setModal({ modo: 'ver', c })}>Ver</button>
                      <button type="button" className="boton boton--claro boton--chico" onClick={() => setModal({ modo: 'editar', c })}>Editar</button>
                      <button type="button" className={`boton boton--chico ${c.estado !== 'INACTIVO' ? 'boton--peligro' : 'boton--claro'}`} onClick={() => alternar(c)}>
                        {c.estado !== 'INACTIVO' ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        abierto={Boolean(modal)}
        onCerrar={() => setModal(null)}
        ancho="ancho"
        titulo={modal?.modo === 'nuevo' ? 'Nuevo conductor' : modal?.modo === 'editar' ? 'Editar conductor' : 'Conductor'}
      >
        {modal?.modo === 'ver' ? <Detalle c={modal.c} /> : modal && (
          <FormularioConductor inicial={modal.c} onGuardado={alGuardar} onCancelar={() => setModal(null)} />
        )}
      </Modal>
    </>
  );
}
