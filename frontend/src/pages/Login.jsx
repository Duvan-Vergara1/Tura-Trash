import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Aviso, Campo } from '../components/UI';
import { Marca } from '../components/Layout';

export default function Login() {
  const { autenticado, iniciarSesion, aviso, setAviso } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [campos, setCampos] = useState({});
  const [enviando, setEnviando] = useState(false);

  if (autenticado) return <Navigate to="/dashboard" replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setAviso('');
    setCampos({});
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y tu contraseña.');
      setCampos({ email: !email.trim() ? 'Ingresa tu correo.' : undefined, password: !password ? 'Ingresa tu contraseña.' : undefined });
      return;
    }
    setEnviando(true);
    try {
      await iniciarSesion(email.trim(), password);
      navegar(ubicacion.state?.desde || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      setCampos(err.campos || {});
    } finally {
      setEnviando(false);
    }
  };

  const avisoEsExito = aviso === 'Cerraste sesión correctamente.';

  return (
    <div className="login">
      <section className="login__panel">
        <Marca />
        <h1>Panel administrativo</h1>
        <p className="login__subtitulo">Gestión de rutas de recolección de residuos de Buenaventura.</p>

        <Aviso tipo={avisoEsExito ? 'exito' : 'alerta'} onCerrar={() => setAviso('')}>
          {aviso}
        </Aviso>
        <Aviso tipo="error">{error}</Aviso>

        <form onSubmit={enviar} noValidate className="login__formulario">
          <Campo etiqueta="Correo" error={campos.email}>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@turatrash.co"
              autoFocus
            />
          </Campo>
          <Campo etiqueta="Contraseña" error={campos.password}>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Campo>
          <button type="submit" className="boton boton--primario boton--bloque" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </section>
      <aside className="login__ilustracion" aria-hidden="true">
        <div className="login__frase">
          <strong>Rutas limpias,</strong>
          <span>ciudad limpia.</span>
        </div>
      </aside>
    </div>
  );
}
