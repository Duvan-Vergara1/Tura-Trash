import { Link } from 'react-router-dom';
import { api } from '../api/cliente';
import { Aviso, Cargando, EncabezadoPagina, useCarga } from '../components/UI';

const ICONOS = { vehiculos: '🚛', conductores: '👷', rutas: '🗺', programacion: '📅' };

export default function Dashboard() {
  const panel = useCarga(() => api.get('/api/dashboard'), []);

  if (panel.cargando && !panel.datos) return <Cargando texto="Cargando el panel…" />;
  if (panel.error) return <Aviso tipo="error">{panel.error.message}</Aviso>;

  const { usuario, modulos } = panel.datos;

  return (
    <>
      <EncabezadoPagina titulo={`Hola, ${usuario.nombre.split(' ')[0]}`} descripcion="Panel administrativo de la operación de recolección." />
      <section className="modulos" aria-label="Módulos">
        {modulos.map((m) => (
          <Link key={m.clave} to={m.ruta} className="modulo">
            <span className="modulo__icono" aria-hidden="true">{ICONOS[m.clave]}</span>
            <strong>{m.nombre}</strong>
            <span>{m.descripcion}</span>
          </Link>
        ))}
      </section>
    </>
  );
}
