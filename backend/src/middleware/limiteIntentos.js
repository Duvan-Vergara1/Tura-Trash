// Límite simple de intentos fallidos de inicio de sesión (en memoria).
// Bloquea por 15 minutos tras 10 fallos seguidos del mismo correo desde la
// misma IP. Suficiente para una sola instancia del backend.
const { errores } = require('../utils/errores');

const MAX_INTENTOS = 10;
const VENTANA_MS = 15 * 60 * 1000;
const intentos = new Map();

function clave(req) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${req.ip}|${email}`;
}

function verificarLimite(req, res, next) {
  const registro = intentos.get(clave(req));
  if (registro && registro.fallos >= MAX_INTENTOS && Date.now() - registro.desde < VENTANA_MS) {
    throw errores.demasiadosIntentos('Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo.');
  }
  next();
}

function registrarFallo(req) {
  const k = clave(req);
  const registro = intentos.get(k);
  if (!registro || Date.now() - registro.desde >= VENTANA_MS) {
    intentos.set(k, { fallos: 1, desde: Date.now() });
  } else {
    registro.fallos += 1;
  }
}

function limpiar(req) {
  intentos.delete(clave(req));
}

module.exports = { verificarLimite, registrarFallo, limpiar, _intentos: intentos };
