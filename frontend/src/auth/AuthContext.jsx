import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, registrarExpiracion, sesionGuardada } from '../api/cliente';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => (sesionGuardada.token() ? sesionGuardada.usuario() : null));
  const [aviso, setAviso] = useState('');

  const limpiar = useCallback((mensaje = '') => {
    sesionGuardada.borrar();
    setUsuario(null);
    setAviso(mensaje);
  }, []);

  // Si el backend responde 401 en cualquier pantalla, se cierra la sesión local.
  useEffect(() => {
    registrarExpiracion((mensaje) => limpiar(mensaje || 'Tu sesión terminó. Inicia sesión de nuevo.'));
  }, [limpiar]);

  // Al recargar, confirma con el backend que la sesión guardada sigue abierta.
  useEffect(() => {
    if (!sesionGuardada.token()) return;
    api
      .get('/api/auth/me')
      .then(({ usuario: actual }) => {
        sesionGuardada.guardar(sesionGuardada.token(), actual);
        setUsuario(actual);
      })
      .catch(() => {});
  }, []);

  const iniciarSesion = useCallback(async (email, password) => {
    const { token, usuario: nuevo } = await api.post('/api/auth/login', { email, password });
    sesionGuardada.guardar(token, nuevo);
    setUsuario(nuevo);
    setAviso('');
    return nuevo;
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Aunque el backend no responda, la sesión local se borra igual.
    }
    limpiar('Cerraste sesión correctamente.');
  }, [limpiar]);

  const valor = useMemo(
    () => ({ usuario, autenticado: Boolean(usuario), iniciarSesion, cerrarSesion, aviso, setAviso }),
    [usuario, iniciarSesion, cerrarSesion, aviso],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
