// Configuración de Knex para migraciones, seeds y la conexión de la API.
const config = require('./src/config');

const base = {
  client: 'pg',
  connection: {
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: 0,
    max: 10,
    // La operación es en Colombia: CURRENT_DATE y now() se calculan con la
    // hora de Bogotá aunque el servidor de la base de datos esté en UTC.
    afterCreate(conexion, listo) {
      conexion.query("SET TIME ZONE 'America/Bogota'", (error) => listo(error, conexion));
    },
  },
  migrations: {
    directory: './db/migrations',
    tableName: 'knex_migraciones',
  },
  seeds: {
    directory: './db/seeds',
  },
};

module.exports = {
  development: base,
  test: base,
  production: base,
};
