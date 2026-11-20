// Turnos, programaciones y servicios del día (entrega 4).
const { Router } = require('express');
const { parametroId } = require('../validators/comunes');
const {
  esquemaTurno,
  filtrosTurnos,
  esquemaProgramacion,
  esquemaCancelacion,
  filtrosProgramaciones,
  filtrosServicios,
  parametrosServicio,
  esquemaEstadoServicio,
} = require('../validators/programacion');
const turnos = require('../services/turnos.service');
const programaciones = require('../services/programaciones.service');
const servicios = require('../services/servicios.service');

// ----------------------------------------------------------------- Turnos --
const rutasTurnos = Router();

rutasTurnos.get('/', async (req, res) => {
  res.json(await turnos.listar(filtrosTurnos.parse(req.query)));
});
rutasTurnos.get('/:id', async (req, res) => {
  res.json(await turnos.obtener(parametroId.parse(req.params).id));
});
rutasTurnos.post('/', async (req, res) => {
  res.status(201).json(await turnos.crear(esquemaTurno.parse(req.body ?? {})));
});
rutasTurnos.put('/:id', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await turnos.actualizar(id, esquemaTurno.parse(req.body ?? {})));
});
rutasTurnos.patch('/:id/desactivar', async (req, res) => {
  res.json(await turnos.cambiarActivo(parametroId.parse(req.params).id, false));
});
rutasTurnos.patch('/:id/activar', async (req, res) => {
  res.json(await turnos.cambiarActivo(parametroId.parse(req.params).id, true));
});

// --------------------------------------------------------- Programaciones --
const rutasProgramaciones = Router();

rutasProgramaciones.get('/', async (req, res) => {
  res.json(await programaciones.listar(filtrosProgramaciones.parse(req.query)));
});

// Revisa reglas y conflictos sin guardar (el formulario lo usa para advertir).
rutasProgramaciones.post('/validar', async (req, res) => {
  const datos = esquemaProgramacion.parse(req.body ?? {});
  const excluirId = Number(req.query.excluir_id) || undefined;
  res.json(await programaciones.evaluar(datos, { excluirId, esNueva: !excluirId }));
});

rutasProgramaciones.get('/:id', async (req, res) => {
  res.json(await programaciones.obtener(parametroId.parse(req.params).id));
});
rutasProgramaciones.post('/', async (req, res) => {
  const datos = esquemaProgramacion.parse(req.body ?? {});
  res.status(201).json(await programaciones.crear(datos, req.usuario.id));
});
rutasProgramaciones.put('/:id', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await programaciones.actualizar(id, esquemaProgramacion.parse(req.body ?? {})));
});
rutasProgramaciones.patch('/:id/cancelar', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  const { motivo } = esquemaCancelacion.parse(req.body ?? {});
  res.json(await programaciones.cancelar(id, motivo));
});
rutasProgramaciones.patch('/:id/desactivar', async (req, res) => {
  res.json(await programaciones.desactivar(parametroId.parse(req.params).id));
});
rutasProgramaciones.patch('/:id/activar', async (req, res) => {
  res.json(await programaciones.activar(parametroId.parse(req.params).id));
});

// -------------------------------------------------------------- Servicios --
const rutasServicios = Router();

rutasServicios.get('/', async (req, res) => {
  res.json(await servicios.listar(filtrosServicios.parse(req.query)));
});
rutasServicios.put('/:programacionId/:fecha', async (req, res) => {
  const { programacionId, fecha } = parametrosServicio.parse(req.params);
  const datos = esquemaEstadoServicio.parse(req.body ?? {});
  res.json(await servicios.cambiarEstado(programacionId, fecha, datos, req.usuario.id));
});

module.exports = { rutasTurnos, rutasProgramaciones, rutasServicios };
