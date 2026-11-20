// Errores de la API con un formato único:
// { "error": { "codigo": "...", "mensaje": "...", "campos"?: {...}, "detalles"?: [...] } }

class ErrorApi extends Error {
  constructor(estado, codigo, mensaje, extra = {}) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
    this.campos = extra.campos;
    this.detalles = extra.detalles;
  }
}

const errores = {
  validacion: (mensaje, campos) => new ErrorApi(400, 'VALIDACION', mensaje, { campos }),
  noAutenticado: (mensaje = 'Debes iniciar sesión para continuar.', codigo = 'NO_AUTENTICADO') =>
    new ErrorApi(401, codigo, mensaje),
  sinPermisos: (mensaje = 'No tienes permisos de administrador para esta acción.', codigo = 'SIN_PERMISOS') =>
    new ErrorApi(403, codigo, mensaje),
  noEncontrado: (mensaje = 'El recurso solicitado no existe.') => new ErrorApi(404, 'NO_ENCONTRADO', mensaje),
  conflicto: (mensaje, extra) => new ErrorApi(409, 'CONFLICTO', mensaje, extra),
  reglaNegocio: (codigo, mensaje, extra) => new ErrorApi(422, codigo, mensaje, extra),
  demasiadosIntentos: (mensaje) => new ErrorApi(429, 'DEMASIADOS_INTENTOS', mensaje),
};

module.exports = { ErrorApi, errores };
