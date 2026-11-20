const { Router } = require('express');
const { parametroId } = require('../validators/comunes');
const { esquemaConductor, esquemaEstado, filtrosConductores } = require('../validators/conductores');
const servicio = require('../services/conductores.service');

const router = Router();

router.get('/', async (req, res) => {
  res.json(await servicio.listar(filtrosConductores.parse(req.query)));
});

router.get('/:id', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await servicio.obtener(id));
});

router.post('/', async (req, res) => {
  res.status(201).json(await servicio.crear(esquemaConductor.parse(req.body ?? {})));
});

router.put('/:id', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await servicio.actualizar(id, esquemaConductor.parse(req.body ?? {})));
});

router.patch('/:id/estado', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  const { estado } = esquemaEstado.parse(req.body ?? {});
  res.json(await servicio.cambiarEstado(id, estado));
});

// "Desactivar" un conductor = estado INACTIVO (se conserva el historial).
router.patch('/:id/desactivar', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await servicio.cambiarEstado(id, 'INACTIVO'));
});

router.patch('/:id/activar', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await servicio.cambiarEstado(id, 'ACTIVO'));
});

module.exports = router;
