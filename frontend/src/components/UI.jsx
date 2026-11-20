// Piezas de interfaz reutilizables.
import { useCallback, useEffect, useState } from 'react';

export function Insignia({ tono = 'neutro', children }) {
  return <span className={`insignia insignia--${tono}`}>{children}</span>;
}

/** Muestra una etiqueta desde un mapa { CLAVE: { texto, tono } }. */
export function EstadoInsignia({ mapa, valor }) {
  const info = mapa[valor] || { texto: valor, tono: 'neutro' };
  return <Insignia tono={info.tono}>{info.texto}</Insignia>;
}

export function Aviso({ tipo = 'info', children, onCerrar }) {
  if (!children) return null;
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <div className="aviso__texto">{children}</div>
      {onCerrar && (
        <button type="button" className="aviso__cerrar" onClick={onCerrar} aria-label="Cerrar aviso">
          ×
        </button>
      )}
    </div>
  );
}

/** Lista de advertencias que devuelve el backend tras guardar. */
export function Advertencias({ lista, onCerrar }) {
  if (!lista?.length) return null;
  return (
    <Aviso tipo="alerta" onCerrar={onCerrar}>
      <ul className="lista-simple">
        {lista.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </Aviso>
  );
}

export function Campo({ etiqueta, error, ayuda, children, ancho }) {
  return (
    <label className={`campo ${ancho ? `campo--${ancho}` : ''} ${error ? 'campo--error' : ''}`}>
      <span className="campo__etiqueta">{etiqueta}</span>
      {children}
      {error ? <span className="campo__error">{error}</span> : ayuda ? <span className="campo__ayuda">{ayuda}</span> : null}
    </label>
  );
}

export function Modal({ titulo, abierto, onCerrar, children, ancho = 'normal' }) {
  useEffect(() => {
    if (!abierto) return undefined;
    const alPresionar = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [abierto, onCerrar]);

  if (!abierto) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className={`modal__caja modal__caja--${ancho}`}>
        <header className="modal__cabecera">
          <h2>{titulo}</h2>
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="modal__cuerpo">{children}</div>
      </div>
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="cargando" role="status">
      <span className="cargando__punto" />
      {texto}
    </div>
  );
}

export function Vacio({ children }) {
  return <div className="vacio">{children}</div>;
}

export function EncabezadoPagina({ titulo, descripcion, children }) {
  return (
    <header className="encabezado-pagina">
      <div>
        <h1>{titulo}</h1>
        {descripcion && <p>{descripcion}</p>}
      </div>
      {children && <div className="encabezado-pagina__acciones">{children}</div>}
    </header>
  );
}

/** Carga datos de una función async y expone { datos, cargando, error, recargar }. */
export function useCarga(funcion, dependencias = []) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cargar = useCallback(funcion, dependencias);

  const recargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      const datos = await cargar();
      setEstado({ datos, cargando: false, error: null });
    } catch (error) {
      setEstado({ datos: null, cargando: false, error });
    }
  }, [cargar]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { ...estado, recargar };
}

/** Maneja el envío de formularios: errores por campo, mensaje general y "guardando". */
export function useFormulario(inicial) {
  const [valores, setValores] = useState(inicial);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (e) => {
    const valor = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setValores((v) => ({ ...v, [campo]: valor }));
    setErrores((er) => ({ ...er, [campo]: undefined }));
  };

  const enviar = async (accion) => {
    setGuardando(true);
    setMensaje('');
    setErrores({});
    try {
      return await accion(valores);
    } catch (error) {
      setErrores(error.campos || {});
      setMensaje(error.message);
      return null;
    } finally {
      setGuardando(false);
    }
  };

  return { valores, setValores, errores, setErrores, mensaje, setMensaje, guardando, cambiar, enviar };
}
