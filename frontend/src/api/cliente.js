// Cliente HTTP del frontend. Envía el token en cada petición y convierte los
// errores del backend en objetos fáciles de mostrar en pantalla.

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const CLAVE_TOKEN = 'tura_trash_token';
const CLAVE_USUARIO = 'tura_trash_usuario';

export class ErrorApi extends Error {
  constructor(estado, cuerpo) {
    const error = cuerpo?.error || {};
    super(error.mensaje || 'No se pudo completar la operación.');
    this.estado = estado;
    this.codigo = error.codigo || 'ERROR';
    this.campos = error.campos || {};
    this.detalles = error.detalles || [];
  }
}

export const sesionGuardada = {
  token: () => localStorage.getItem(CLAVE_TOKEN),
  usuario: () => {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_USUARIO));
    } catch {
      return null;
    }
  },
  guardar(token, usuario) {
    localStorage.setItem(CLAVE_TOKEN, token);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
  },
  borrar() {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
  },
};

// El AuthContext registra aquí qué hacer cuando la sesión deja de ser válida.
let alExpirarSesion = () => {};
export function registrarExpiracion(fn) {
  alExpirarSesion = fn;
}

async function peticion(metodo, ruta, cuerpo) {
  const cabeceras = { Accept: 'application/json' };
  const token = sesionGuardada.token();
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(0, {
      error: { codigo: 'SIN_CONEXION', mensaje: 'No hay conexión con el servidor. Revisa tu internet o intenta más tarde.' },
    });
  }

  const texto = await respuesta.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = null;
  }

  if (!respuesta.ok) {
    const error = new ErrorApi(respuesta.status, datos);
    if (respuesta.status === 401 && ruta !== '/api/auth/login') alExpirarSesion(error.message);
    throw error;
  }
  return datos;
}

export const api = {
  get: (ruta) => peticion('GET', ruta),
  post: (ruta, cuerpo = {}) => peticion('POST', ruta, cuerpo),
  put: (ruta, cuerpo = {}) => peticion('PUT', ruta, cuerpo),
  patch: (ruta, cuerpo = {}) => peticion('PATCH', ruta, cuerpo),
};

/** Convierte un objeto de filtros en "?a=1&b=2" ignorando los vacíos. */
export function query(filtros) {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(clave, valor);
  }
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}
