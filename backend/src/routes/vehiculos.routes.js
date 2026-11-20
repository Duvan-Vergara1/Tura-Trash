const { Router } = require('express');
const { parametroId } = require('../validators/comunes');
const { esquemaVehiculo, esquemaEstado, filtrosVehiculos } = require('../validators/vehiculos');
const servicio = require('../services/vehiculos.service');

const router = Router();

router.get('/', async (req, res) => {
  res.json(await servicio.listar(filtrosVehiculos.parse(req.query)));
});

router.get('/:id', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await servicio.obtener(id));
});

router.post('/', async (req, res) => {
  res.status(201).json(await servicio.crear(esquemaVehiculo.parse(req.body ?? {})));
});

router.put('/:id', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await servicio.actualizar(id, esquemaVehiculo.parse(req.body ?? {})));
});

router.patch('/:id/estado', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  const { estado_operativo } = esquemaEstado.parse(req.body ?? {});
  res.json(await servicio.cambiarEstado(id, estado_operativo));
});

router.patch('/:id/desactivar', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await servicio.cambiarActivo(id, false));
});

router.patch('/:id/activar', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await servicio.cambiarActivo(id, true));
});

module.exports = router;
