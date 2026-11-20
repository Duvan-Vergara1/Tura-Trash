// Protección de endpoints: quién está autenticado y con qué rol.
const { validarToken } = require('../services/auth.service');
const { errores } = require('../utils/errores');

async function requiereAutenticacion(req, res, next) {
  const cabecera = req.get('authorization') || '';
  const [tipo, token] = cabecera.split(' ');
  if (tipo !== 'Bearer' || !token) {
    throw errores.noAutenticado();
  }
  const { usuario, sesionId } = await validarToken(token);
  req.usuario = usuario;
  req.sesionId = sesionId;
  next();
}

function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      throw errores.sinPermisos();
    }
    next();
  };
}

module.exports = { requiereAutenticacion, requiereRol };
