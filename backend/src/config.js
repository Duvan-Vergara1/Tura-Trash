// Configuración central del backend. Lee las variables de entorno una sola vez
// y falla rápido si falta algo obligatorio en producción.
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const entorno = process.env.NODE_ENV || 'development';
const esProduccion = entorno === 'production';
const esPrueba = entorno === 'test';

function obligatoria(nombre, valorPorDefecto) {
  const valor = process.env[nombre];
  if (valor !== undefined && valor !== '') return valor;
  if (esProduccion) {
    throw new Error(`Falta la variable de entorno obligatoria ${nombre}`);
  }
  return valorPorDefecto;
}

const databaseUrl = esPrueba
  ? process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/tura_trash_test'
  : obligatoria('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/tura_trash');

const jwtSecret = obligatoria('JWT_SECRET', 'solo-para-desarrollo-cambiar-en-produccion');
const CLAVES_DE_EJEMPLO = ['cambia-esta-clave-por-una-larga-y-aleatoria', 'solo-para-desarrollo-cambiar-en-produccion'];
if (esProduccion && (jwtSecret.length < 32 || CLAVES_DE_EJEMPLO.includes(jwtSecret))) {
  throw new Error('JWT_SECRET debe ser una clave propia y aleatoria de al menos 32 caracteres en producción');
}

module.exports = {
  entorno,
  esProduccion,
  esPrueba,
  puerto: Number(process.env.PORT) || 4000,
  databaseUrl,
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  admin: {
    nombre: process.env.ADMIN_NOMBRE || 'Administrador Tura Trash',
    email: process.env.ADMIN_EMAIL || 'admin@turatrash.co',
    password: process.env.ADMIN_PASSWORD || 'Admin123*',
  },
};
