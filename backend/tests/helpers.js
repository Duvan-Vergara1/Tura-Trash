// Utilidades de prueba. Cada archivo de pruebas reconstruye la base de datos
// de pruebas (TEST_DATABASE_URL) desde cero con las migraciones y los seeds.
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const { db } = require('../src/db');
const { hoy } = require('../src/utils/fechas');

const api = request(app);

async function prepararBaseDatos() {
  await db.migrate.rollback(undefined, true);
  await db.migrate.latest();
  await db.seed.run();
}

async function cerrarBaseDatos() {
  await db.destroy();
}

async function tokenAdmin() {
  const res = await api.post('/api/auth/login').send({ email: 'admin@turatrash.co', password: 'Admin123*' });
  if (res.status !== 200) throw new Error(`No se pudo iniciar sesión en las pruebas: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

/** Fecha 'AAAA-MM-DD' a N días de hoy. */
function fechaRelativa(dias) {
  const [a, m, d] = hoy().split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

module.exports = { api, db, prepararBaseDatos, cerrarBaseDatos, tokenAdmin, fechaRelativa, hoy };
