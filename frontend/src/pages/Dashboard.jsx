import { Link } from 'react-router-dom';
import { api } from '../api/cliente';
import { Aviso, Cargando, EncabezadoPagina, useCarga } from '../components/UI';

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

export default function Dashboard() {
  const panel = useCarga(() => api.get('/api/dashboard'), []);

  if (panel.cargando && !panel.datos) return <Cargando texto="Cargando el panel…" />;
  if (panel.error) return <Aviso tipo="error">{panel.error.message}</Aviso>;

  const { usuario, modulos, indicadores: i } = panel.datos;

  return (
    <>
      <EncabezadoPagina titulo={`Hola, ${usuario.nombre.split(' ')[0]}`} descripcion="Resumen de la operación de recolección en Buenaventura.">
        <button type="button" className="boton boton--claro" onClick={panel.recargar}>Actualizar</button>
      </EncabezadoPagina>

      <section className="modulos" aria-label="Módulos">
        {modulos.map((m) => (
          <Link key={m.clave} to={m.ruta} className="modulo">
            <span className="modulo__icono" aria-hidden="true">{ICONOS[m.clave]}</span>
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
      </section>
    </>
  );
}
