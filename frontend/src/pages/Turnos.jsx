import { useState } from 'react';
import { api } from '../api/cliente';
import { Aviso, Campo, Cargando, EncabezadoPagina, Insignia, Modal, Vacio, useCarga, useFormulario } from '../components/UI';

function FormularioTurno({ inicial, onGuardado, onCancelar }) {
  const f = useFormulario(inicial ? { nombre: inicial.nombre, hora_inicio: inicial.hora_inicio, hora_fin: inicial.hora_fin } : { nombre: '', hora_inicio: '06:00', hora_fin: '14:00' });
  const guardar = (e) => {
    e.preventDefault();
    f.enviar(async (v) => {
      const r = inicial ? await api.put(`/api/turnos/${inicial.id}`, v) : await api.post('/api/turnos', v);
      onGuardado(r, inicial ? 'Turno actualizado.' : 'Turno creado.');
    });
  };
  return (
    <form onSubmit={guardar} noValidate>
      <Aviso tipo="error">{f.mensaje}</Aviso>
      <Campo etiqueta="Nombre *" error={f.errores.nombre}>
        <input value={f.valores.nombre} onChange={f.cambiar('nombre')} maxLength={60} placeholder="Ej. Mañana" autoFocus />
      </Campo>
      <div className="rejilla-formulario">
        <Campo etiqueta="Hora de inicio *" error={f.errores.hora_inicio}>
          <input type="time" value={f.valores.hora_inicio} onChange={f.cambiar('hora_inicio')} />
        </Campo>
        <Campo etiqueta="Hora de finalización *" error={f.errores.hora_fin}>
          <input type="time" value={f.valores.hora_fin} onChange={f.cambiar('hora_fin')} />
        </Campo>
      </div>
      <div className="acciones-formulario">
        <button type="button" className="boton boton--claro" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton boton--primario" disabled={f.guardando}>{f.guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}

export default function Turnos() {
  const [modal, setModal] = useState(null);
  const [exito, setExito] = useState('');
  const [error, setError] = useState('');
  const { datos, cargando, error: errorCarga, recargar } = useCarga(() => api.get('/api/turnos'), []);

  const alternar = async (t) => {
    setError('');
    try {
      await api.patch(`/api/turnos/${t.id}/${t.activo ? 'desactivar' : 'activar'}`);
      setExito(`Turno ${t.activo ? 'desactivado' : 'activado'}.`);
      recargar();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <EncabezadoPagina titulo="Turnos" descripcion="Franjas horarias en las que se programa el servicio.">
        <button type="button" className="boton boton--primario" onClick={() => setModal({})}>+ Nuevo turno</button>
      </EncabezadoPagina>
      <Aviso tipo="exito" onCerrar={() => setExito('')}>{exito}</Aviso>
      <Aviso tipo="error" onCerrar={() => setError('')}>{error || errorCarga?.message}</Aviso>
      <section className="tarjeta">
        {cargando && !datos ? <Cargando /> : !datos?.datos.length ? <Vacio>No hay turnos.</Vacio> : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead><tr><th>Turno</th><th>Horario</th><th>Programaciones activas</th><th>Estado</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {datos.datos.map((t) => (
                  <tr key={t.id} className={t.activo ? '' : 'fila-apagada'}>
                    <td><strong>{t.nombre}</strong></td>
                    <td>{t.hora_inicio} – {t.hora_fin}</td>
                    <td>{t.programaciones_activas}</td>
                    <td>{t.activo ? <Insignia tono="ok">Activo</Insignia> : <Insignia>Inactivo</Insignia>}</td>
                    <td className="tabla__acciones">
                      <button type="button" className="boton boton--claro boton--chico" onClick={() => setModal({ turno: t })}>Editar</button>
                      <button type="button" className={`boton boton--chico ${t.activo ? 'boton--peligro' : 'boton--claro'}`} onClick={() => alternar(t)}>
                        {t.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Modal abierto={Boolean(modal)} onCerrar={() => setModal(null)} titulo={modal?.turno ? 'Editar turno' : 'Nuevo turno'}>
        {modal && (
          <FormularioTurno
            inicial={modal.turno}
            onCancelar={() => setModal(null)}
            onGuardado={(_, m) => { setModal(null); setExito(m); recargar(); }}
          />
        )}
      </Modal>
    </>
  );
}
