const app = require('./app');
const config = require('./config');
const { db, comprobarConexion } = require('./db');

const servidor = app.listen(config.puerto, async () => {
  const conectada = await comprobarConexion();
  console.log(`Tura Trash API escuchando en el puerto ${config.puerto} (${config.entorno})`);
  console.log(conectada ? 'Base de datos: conectada' : 'Base de datos: SIN CONEXIÓN, revisa DATABASE_URL');
});

function apagar() {
  servidor.close(() => db.destroy().finally(() => process.exit(0)));
}
process.on('SIGTERM', apagar);
process.on('SIGINT', apagar);
