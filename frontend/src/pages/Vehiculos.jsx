import { useState } from 'react';
import { api, query } from '../api/cliente';
import {
  Advertencias, Aviso, Campo, Cargando, EncabezadoPagina, EstadoInsignia, Insignia, Modal, Vacio, useCarga, useFormulario,
} from '../components/UI';
import { ESTADOS_VEHICULO, TIPOS_VEHICULO, fechaCorta, opciones } from '../utils/formato';

const VACIO = { placa: '', tipo: 'COMPACTADOR', marca: '', modelo: '', anio: '', capacidad_kg: '', estado_operativo: 'DISPONIBLE', observaciones: '' };

function FormularioVehiculo({ inicial, onGuardado, onCancelar }) {
  const f = useFormulario(inicial ? { ...VACIO, ...inicial, anio: inicial.anio ?? '', capacidad_kg: inicial.capacidad_kg ?? '', observaciones: inicial.observaciones ?? '' } : VACIO);

  const guardar = (e) => {
    e.preventDefault();
    f.enviar(async (v) => {
      const cuerpo = {
        placa: v.placa, tipo: v.tipo, marca: v.marca, modelo: v.modelo, anio: v.anio, capacidad_kg: v.capacidad_kg,
        estado_operativo: v.estado_operativo, observaciones: v.observaciones,
      };
      const resultado = inicial ? await api.put(`/api/vehiculos/${inicial.id}`, cuerpo) : await api.post('/api/vehiculos', cuerpo);
      onGuardado(resultado, inicial ? 'Vehículo actualizado.' : 'Vehículo registrado.');
    });
  };

  return (
    <form onSubmit={guardar} noValidate>
      <Aviso tipo="error">{f.mensaje}</Aviso>
      <div className="rejilla-formulario">
        <Campo etiqueta="Placa *" error={f.errores.placa} ayuda="Ej. ABC123">
          <input value={f.valores.placa} onChange={f.cambiar('placa')} maxLength={8} className="mayusculas" />
        </Campo>
        <Campo etiqueta="Tipo *" error={f.errores.tipo}>
          <select value={f.valores.tipo} onChange={f.cambiar('tipo')}>
            {opciones(TIPOS_VEHICULO).map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Marca *" error={f.errores.marca}>
          <input value={f.valores.marca} onChange={f.cambiar('marca')} maxLength={60} />
        </Campo>
        <Campo etiqueta="Modelo *" error={f.errores.modelo}>
          <input value={f.valores.modelo} onChange={f.cambiar('modelo')} maxLength={60} />
        </Campo>
        <Campo etiqueta="Año" error={f.errores.anio}>
          <input type="number" value={f.valores.anio} onChange={f.cambiar('anio')} min={1980} />
        </Campo>
        <Campo etiqueta="Capacidad (kg)" error={f.errores.capacidad_kg}>
          <input type="number" value={f.valores.capacidad_kg} onChange={f.cambiar('capacidad_kg')} min={1} />
        </Campo>
        <Campo etiqueta="Estado operativo *" error={f.errores.estado_operativo} ancho="completo">
          <div className="segmentado">
            {opciones(ESTADOS_VEHICULO).map((o) => (
              <button
                type="button"
                key={o.valor}
                className={f.valores.estado_operativo === o.valor ? 'activo' : ''}
                onClick={() => f.cambiar('estado_operativo')(o.valor)}
              >
                {o.texto}
              </button>
            ))}
          </div>
        </Campo>
        <Campo etiqueta="Observaciones" error={f.errores.observaciones} ancho="completo">
          <textarea value={f.valores.observaciones} onChange={f.cambiar('observaciones')} rows={2} maxLength={500} />
        </Campo>
      </div>
      <div className="acciones-formulario">
        <button type="button" className="boton boton--claro" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton boton--primario" disabled={f.guardando}>{f.guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}

function Detalle({ vehiculo }) {
  return (
    <dl className="detalle">
      <dt>Placa</dt><dd><span className="placa">{vehiculo.placa}</span></dd>
      <dt>Tipo</dt><dd>{TIPOS_VEHICULO[vehiculo.tipo]}</dd>
      <dt>Marca y modelo</dt><dd>{vehiculo.marca} {vehiculo.modelo}</dd>
      <dt>Año</dt><dd>{vehiculo.anio ?? '—'}</dd>
      <dt>Capacidad</dt><dd>{vehiculo.capacidad_kg ? `${vehiculo.capacidad_kg.toLocaleString('es-CO')} kg` : '—'}</dd>
      <dt>Estado operativo</dt><dd><EstadoInsignia mapa={ESTADOS_VEHICULO} valor={vehiculo.estado_operativo} /></dd>
      <dt>Registro</dt><dd>{vehiculo.activo ? <Insignia tono="ok">Activo</Insignia> : <Insignia>Desactivado</Insignia>}</dd>
      <dt>Observaciones</dt><dd>{vehiculo.observaciones || '—'}</dd>
      <dt>Registrado</dt><dd>{fechaCorta(vehiculo.creado_en)}</dd>
    </dl>
  );
}

export default function Vehiculos() {
  const [filtros, setFiltros] = useState({ q: '', estado_operativo: '', activo: '' });
  const [modal, setModal] = useState(null); // { modo: 'nuevo' | 'editar' | 'ver', vehiculo }
  const [exito, setExito] = useState('');
  const [advertencias, setAdvertencias] = useState([]);
  const [error, setError] = useState('');
  const { datos, cargando, error: errorCarga, recargar } = useCarga(
    () => api.get(`/api/vehiculos${query(filtros)}`),
    [filtros.q, filtros.estado_operativo, filtros.activo],
  );

  const alGuardar = (vehiculo, mensaje) => {
    setModal(null);
    setExito(mensaje);
    setAdvertencias(vehiculo.advertencias || []);
    recargar();
  };

  const alternarActivo = async (v) => {
    const accion = v.activo ? 'desactivar' : 'activar';
    if (v.activo && !window.confirm(`¿Desactivar el vehículo ${v.placa}? No podrá asignarse a nuevas programaciones.`)) return;
    setError('');
    try {
      const r = await api.patch(`/api/vehiculos/${v.id}/${accion}`);
      setExito(`Vehículo ${v.placa} ${v.activo ? 'desactivado' : 'activado'}.`);
      setAdvertencias(r.advertencias || []);
      recargar();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <EncabezadoPagina titulo="Vehículos" descripcion="Flota de recolección: registro, estado operativo y disponibilidad.">
        <button type="button" className="boton boton--primario" onClick={() => setModal({ modo: 'nuevo' })}>+ Nuevo vehículo</button>
      </EncabezadoPagina>

      <Aviso tipo="exito" onCerrar={() => setExito('')}>{exito}</Aviso>
      <Advertencias lista={advertencias} onCerrar={() => setAdvertencias([])} />
      <Aviso tipo="error" onCerrar={() => setError('')}>{error || errorCarga?.message}</Aviso>

      <section className="tarjeta">
        <div className="filtros">
          <label className="filtros__busqueda">
            Buscar
            <input type="search" placeholder="Placa, marca o modelo" value={filtros.q} onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))} />
          </label>
          <label>
            Estado operativo
            <select value={filtros.estado_operativo} onChange={(e) => setFiltros((f) => ({ ...f, estado_operativo: e.target.value }))}>
              <option value="">Todos</option>
              {opciones(ESTADOS_VEHICULO).map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </label>
          <label>
            Registro
            <select value={filtros.activo} onChange={(e) => setFiltros((f) => ({ ...f, activo: e.target.value }))}>
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Desactivados</option>
            </select>
          </label>
        </div>

        {cargando && !datos ? <Cargando /> : !datos?.datos.length ? <Vacio>No hay vehículos con esos filtros.</Vacio> : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr><th>Placa</th><th>Tipo</th><th>Marca / modelo</th><th>Capacidad</th><th>Estado operativo</th><th>Registro</th><th aria-label="Acciones" /></tr>
              </thead>
              <tbody>
                {datos.datos.map((v) => (
                  <tr key={v.id} className={v.activo ? '' : 'fila-apagada'}>
                    <td><span className="placa">{v.placa}</span></td>
                    <td>{TIPOS_VEHICULO[v.tipo]}</td>
                    <td>{v.marca} {v.modelo}{v.anio ? ` · ${v.anio}` : ''}</td>
                    <td>{v.capacidad_kg ? `${v.capacidad_kg.toLocaleString('es-CO')} kg` : '—'}</td>
                    <td><EstadoInsignia mapa={ESTADOS_VEHICULO} valor={v.estado_operativo} /></td>
                    <td>{v.activo ? <Insignia tono="ok">Activo</Insignia> : <Insignia>Desactivado</Insignia>}</td>
                    <td className="tabla__acciones">
                      <button type="button" className="boton boton--claro boton--chico" onClick={() => setModal({ modo: 'ver', vehiculo: v })}>Ver</button>
                      <button type="button" className="boton boton--claro boton--chico" onClick={() => setModal({ modo: 'editar', vehiculo: v })}>Editar</button>
                      <button type="button" className={`boton boton--chico ${v.activo ? 'boton--peligro' : 'boton--claro'}`} onClick={() => alternarActivo(v)}>
                        {v.activo ? 'Desactivar' : 'Activar'}
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
        titulo={modal?.modo === 'nuevo' ? 'Nuevo vehículo' : modal?.modo === 'editar' ? `Editar ${modal.vehiculo.placa}` : `Vehículo ${modal?.vehiculo?.placa ?? ''}`}
      >
        {modal?.modo === 'ver' ? <Detalle vehiculo={modal.vehiculo} /> : modal && (
          <FormularioVehiculo inicial={modal.vehiculo} onGuardado={alGuardar} onCancelar={() => setModal(null)} />
        )}
      </Modal>
    </>
  );
}
