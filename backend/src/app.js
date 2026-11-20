// Aplicación Express: middlewares, rutas públicas y rutas administrativas.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { comprobarConexion } = require('./db');
const { requiereAutenticacion, requiereRol } = require('./middleware/auth');
const { manejarErrores, rutaNoEncontrada } = require('./middleware/errores');
const dashboard = require('./services/dashboard.service');

const app = express();

app.set('trust proxy', 1); // detrás del proxy del proveedor (Render, Railway)
app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origen, listo) {
      // Sin origen = curl, Postman o el mismo servidor.
      if (!origen || config.corsOrigin.includes('*') || config.corsOrigin.includes(origen)) return listo(null, true);
      return listo(null, false);
    },
  }),
);
app.use(express.json({ limit: '200kb' }));

// ------------------------------------------------------------ Públicas --
app.get('/', (req, res) => {
  res.json({ nombre: 'Tura Trash API', documentacion: 'Consulta el README del repositorio', salud: '/api/health' });
});

app.get('/api/health', async (req, res) => {
  const conectada = await comprobarConexion();
  res.status(conectada ? 200 : 503).json({
    estado: conectada ? 'ok' : 'degradado',
    baseDatos: conectada ? 'conectada' : 'sin conexión',
    entorno: config.entorno,
    hora: new Date().toISOString(),
  });
});

app.use('/api/auth', require('./routes/auth.routes'));

// ------------------------------------------- Solo administradores --
const admin = express.Router();
admin.use(requiereAutenticacion, requiereRol('ADMIN'));

admin.get('/dashboard', async (req, res) => {
  res.json(await dashboard.resumen(req.usuario));
});

app.use('/api', admin);

app.use(rutaNoEncontrada);
app.use(manejarErrores);

module.exports = app;
