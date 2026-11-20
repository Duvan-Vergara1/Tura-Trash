import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const ENLACES = [
  { a: '/dashboard', texto: 'Panel', icono: '▦' },
  { a: '/vehiculos', texto: 'Vehículos', icono: '🚛' },
  { a: '/conductores', texto: 'Conductores', icono: '👷' },
  { a: '/rutas', texto: 'Rutas', icono: '🗺' },
  { a: '/programacion', texto: 'Programación', icono: '📅' },
];

export function Marca() {
  return (
    <div className="marca">
      <img src="/favicon.svg" alt="" width="34" height="34" />
      <div>
        <strong>Tura Trash</strong>
        <span>Buenaventura</span>
      </div>
    </div>
  );
}

export default function Layout() {
  const { usuario, cerrarSesion } = useAuth();
  const navegar = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    await cerrarSesion();
    navegar('/login', { replace: true });
  };

  return (
    <div className={`app ${menuAbierto ? 'app--menu' : ''}`}>
      <aside className="lateral">
        <Marca />
        <nav className="lateral__nav" aria-label="Módulos">
          {ENLACES.map((e) => (
            <NavLink key={e.a} to={e.a} onClick={() => setMenuAbierto(false)}>
              <span aria-hidden="true">{e.icono}</span>
              {e.texto}
            </NavLink>
          ))}
        </nav>
        <div className="lateral__usuario">
          <div className="avatar" aria-hidden="true">
            {usuario?.nombre?.[0] || 'A'}
          </div>
          <div>
            <strong>{usuario?.nombre}</strong>
            <span>{usuario?.email}</span>
          </div>
        </div>
        <button type="button" className="boton boton--claro boton--bloque" onClick={salir} disabled={saliendo}>
          {saliendo ? 'Cerrando…' : 'Cerrar sesión'}
        </button>
      </aside>

      <div className="principal">
        <header className="barra-movil">
          <button type="button" className="boton-icono" onClick={() => setMenuAbierto((v) => !v)} aria-label="Abrir menú">
            ☰
          </button>
          <Marca />
        </header>
        <main className="contenido">
          <Outlet />
        </main>
      </div>
      {menuAbierto && <div className="velo" onClick={() => setMenuAbierto(false)} aria-hidden="true" />}
    </div>
  );
}
