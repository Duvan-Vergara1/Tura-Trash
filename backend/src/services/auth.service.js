// Inicio y cierre de sesión. El JWT lleva el id de una fila de "sesiones":
// así el backend puede invalidar un token antes de que expire (logout).
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const config = require('../config');
const { errores } = require('../utils/errores');

// Hash válido de una contraseña aleatoria: se compara cuando el correo no
// existe para que la respuesta tarde lo mismo y no revele qué correos existen.
const HASH_FICTICIO = bcrypt.hashSync('contrasena-ficticia-tura-trash', 10);

function usuarioPublico(u) {
  return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
}

async function crearSesion(usuario, { ip, agente } = {}) {
  const [sesion] = await db('sesiones')
    .insert({
      usuario_id: usuario.id,
      // Se ajusta al vencimiento real del token justo después de firmarlo.
      expira_en: db.raw("now() + interval '1 minute'"),
      ip: ip ? String(ip).slice(0, 64) : null,
      agente: agente ? String(agente).slice(0, 255) : null,
    })
    .returning(['id']);

  const token = jwt.sign({ sid: sesion.id, rol: usuario.rol }, config.jwtSecret, {
    subject: String(usuario.id),
    expiresIn: config.jwtExpiresIn,
  });
  const { exp } = jwt.decode(token);
  const expiraEn = new Date(exp * 1000);
  await db('sesiones').where({ id: sesion.id }).update({ expira_en: expiraEn });

  return { token, expiraEn: expiraEn.toISOString(), sesionId: sesion.id };
}

async function iniciarSesion({ email, password }, contexto) {
  const usuario = await db('usuarios').where({ email: email.toLowerCase() }).first();
  const coincide = await bcrypt.compare(password, usuario ? usuario.password_hash : HASH_FICTICIO);

  if (!usuario || !coincide) {
    throw errores.noAutenticado('Correo o contraseña incorrectos.', 'CREDENCIALES_INVALIDAS');
  }
  if (!usuario.activo) {
    throw errores.sinPermisos('Tu cuenta está desactivada. Contacta al administrador.', 'USUARIO_INACTIVO');
  }
  if (usuario.rol !== 'ADMIN') {
    throw errores.sinPermisos('Esta cuenta no tiene permisos de administrador.', 'SIN_PERMISOS');
  }

  const sesion = await crearSesion(usuario, contexto);
  await db('usuarios').where({ id: usuario.id }).update({ ultimo_acceso: db.fn.now() });
  return { token: sesion.token, expiraEn: sesion.expiraEn, usuario: usuarioPublico(usuario) };
}

/** Comprueba firma, vencimiento, sesión abierta y usuario activo. */
async function validarToken(token) {
  let datos;
  try {
    datos = jwt.verify(token, config.jwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw errores.noAutenticado('Tu sesión expiró. Inicia sesión de nuevo.', 'SESION_EXPIRADA');
    }
    throw errores.noAutenticado('Tu sesión no es válida. Inicia sesión de nuevo.', 'TOKEN_INVALIDO');
  }

  const fila = await db('sesiones as s')
    .join('usuarios as u', 'u.id', 's.usuario_id')
    .where('s.id', datos.sid)
    .first(
      's.id as sesion_id',
      's.cerrada_en',
      's.expira_en',
      'u.id',
      'u.nombre',
      'u.email',
      'u.rol',
      'u.activo',
    );

  if (!fila || String(fila.id) !== String(datos.sub)) {
    throw errores.noAutenticado('Tu sesión no es válida. Inicia sesión de nuevo.', 'TOKEN_INVALIDO');
  }
  if (fila.cerrada_en) {
    throw errores.noAutenticado('Tu sesión fue cerrada. Inicia sesión de nuevo.', 'SESION_CERRADA');
  }
  if (new Date(fila.expira_en) <= new Date()) {
    throw errores.noAutenticado('Tu sesión expiró. Inicia sesión de nuevo.', 'SESION_EXPIRADA');
  }
  if (!fila.activo) {
    throw errores.noAutenticado('Tu cuenta está desactivada. Contacta al administrador.', 'USUARIO_INACTIVO');
  }

  return { sesionId: fila.sesion_id, usuario: usuarioPublico(fila) };
}

async function cerrarSesion(sesionId) {
  await db('sesiones').where({ id: sesionId }).whereNull('cerrada_en').update({ cerrada_en: db.fn.now() });
}

module.exports = { iniciarSesion, validarToken, cerrarSesion, crearSesion, usuarioPublico };
