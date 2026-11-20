// Manejo central de errores: todo error termina con el mismo formato JSON.
const { ZodError } = require('zod');
const { ErrorApi } = require('../utils/errores');
const config = require('../config');

// Restricciones únicas de PostgreSQL -> mensaje y campo para el formulario.
const RESTRICCIONES_UNICAS = {
  uq_usuarios_email: { campo: 'email', mensaje: 'Ya existe un usuario con ese correo.' },
  uq_vehiculos_placa: { campo: 'placa', mensaje: 'Ya existe un vehículo con esa placa.' },
  uq_conductores_documento: { campo: 'numero_documento', mensaje: 'Ya existe un conductor con ese número de documento.' },
  uq_conductores_licencia: { campo: 'licencia_numero', mensaje: 'Ya existe un conductor con ese número de licencia.' },
  uq_barrios_nombre: { campo: 'nombre', mensaje: 'Ya existe un barrio con ese nombre.' },
  uq_rutas_nombre: { campo: 'nombre', mensaje: 'Ya existe una ruta con ese nombre.' },
  uq_turnos_nombre: { campo: 'nombre', mensaje: 'Ya existe un turno con ese nombre.' },
};

function camposDesdeZod(error) {
  const campos = {};
  for (const issue of error.issues) {
    const clave = issue.path.length ? issue.path.join('.') : '_';
    if (!campos[clave]) campos[clave] = issue.message;
  }
  return campos;
}

function responder(res, estado, codigo, mensaje, extra = {}) {
  const cuerpo = { codigo, mensaje };
  if (extra.campos) cuerpo.campos = extra.campos;
  if (extra.detalles) cuerpo.detalles = extra.detalles;
  return res.status(estado).json({ error: cuerpo });
}

// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorApi) {
    return responder(res, err.estado, err.codigo, err.message, err);
  }

  if (err instanceof ZodError) {
    return responder(res, 400, 'VALIDACION', 'Revisa los datos enviados.', { campos: camposDesdeZod(err) });
  }

  // JSON mal formado en el cuerpo de la petición.
  if (err.type === 'entity.parse.failed') {
    return responder(res, 400, 'JSON_INVALIDO', 'El cuerpo de la petición no es un JSON válido.');
  }

  // Errores de PostgreSQL que pueden llegar por carreras o reglas de la BD.
  if (err.code === '23505') {
    const info = RESTRICCIONES_UNICAS[err.constraint];
    if (info) {
      return responder(res, 409, 'DUPLICADO', info.mensaje, { campos: { [info.campo]: info.mensaje } });
    }
    return responder(res, 409, 'DUPLICADO', 'Ya existe un registro con esos datos.');
  }
  if (err.code === '23503') {
    return responder(res, 409, 'EN_USO', 'El registro está relacionado con otros datos y no se puede eliminar o no existe la referencia.');
  }
  if (err.code === '23514' || err.code === '22P02' || err.code === '22007' || err.code === '22008') {
    return responder(res, 400, 'VALIDACION', 'Algún dato no cumple las reglas de la base de datos.');
  }

  if (!config.esPrueba) console.error(err);
  return responder(res, 500, 'ERROR_INTERNO', 'Ocurrió un error inesperado. Intenta de nuevo.');
}

function rutaNoEncontrada(req, res) {
  responder(res, 404, 'RUTA_NO_ENCONTRADA', `No existe el endpoint ${req.method} ${req.path}.`);
}

module.exports = { manejarErrores, rutaNoEncontrada };
