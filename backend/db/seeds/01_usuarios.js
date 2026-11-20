/**
 * Datos mínimos de acceso. Deja la base lista para probar el inicio de sesión:
 * - Administrador inicial (datos ADMIN_* del .env).
 * - Un operador (sin permisos de administrador).
 * - Un administrador desactivado.
 *
 * ATENCIÓN: borra todos los datos existentes antes de cargar. Úsalo solo en
 * desarrollo, pruebas o para dejar una demo limpia.
 */
const bcrypt = require('bcryptjs');
const config = require('../../src/config');

exports.seed = async function seed(knex) {
  await knex.raw(`
    TRUNCATE servicios, programaciones, turnos, ruta_puntos, ruta_barrios, rutas,
             barrios, conductores, vehiculos, sesiones, usuarios
    RESTART IDENTITY CASCADE
  `);

  const usuarios = [
    { nombre: config.admin.nombre, email: config.admin.email, password: config.admin.password, rol: 'ADMIN', activo: true },
    { nombre: 'Operador de prueba', email: 'operador@turatrash.co', password: 'Operador123*', rol: 'OPERADOR', activo: true },
    { nombre: 'Administrador inactivo', email: 'inactivo@turatrash.co', password: 'Inactivo123*', rol: 'ADMIN', activo: false },
  ];

  for (const u of usuarios) {
    await knex('usuarios').insert({
      nombre: u.nombre,
      email: u.email.toLowerCase(),
      password_hash: await bcrypt.hash(u.password, 10),
      rol: u.rol,
      activo: u.activo,
    });
  }
};
