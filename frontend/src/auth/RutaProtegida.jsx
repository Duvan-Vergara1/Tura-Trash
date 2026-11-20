import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Solo deja pasar a administradores con sesión. Quien decide de verdad es el
// backend (cada endpoint valida token y rol); esto evita mostrar pantallas vacías.
export default function RutaProtegida() {
  const { usuario } = useAuth();
  const ubicacion = useLocation();

  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  }
  if (usuario.rol !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
