// Conexión única a PostgreSQL compartida por toda la API.
const knex = require('knex');
const types = require('pg').types;
const knexfile = require('../knexfile');
const config = require('./config');

// DATE (OID 1082) se devuelve como texto 'YYYY-MM-DD' para evitar
// corrimientos de zona horaria al convertirlo a Date de JavaScript.
types.setTypeParser(1082, (valor) => valor);
// NUMERIC (OID 1700) se devuelve como número.
types.setTypeParser(1700, (valor) => (valor === null ? null : Number(valor)));
// BIGINT (OID 20), usado por COUNT(*), se devuelve como número.
types.setTypeParser(20, (valor) => (valor === null ? null : Number(valor)));

const db = knex(knexfile[config.entorno] || knexfile.development);

async function comprobarConexion() {
  try {
    await db.raw('select 1');
    return true;
  } catch {
    return false;
  }
}

module.exports = { db, comprobarConexion };
