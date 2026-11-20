const { Router } = require('express');
const { parametroId } = require('../validators/comunes');
const { esquemaBarrio, filtrosBarrios } = require('../validators/rutas');
const servicio = require('../services/barrios.service');

const router = Router();

router.get('/', async (req, res) => {
  res.json(await servicio.listar(filtrosBarrios.parse(req.query)));
});

router.get('/:id', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await servicio.obtener(id));
});

router.post('/', async (req, res) => {
  res.status(201).json(await servicio.crear(esquemaBarrio.parse(req.body ?? {})));
});

router.put('/:id', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await servicio.actualizar(id, esquemaBarrio.parse(req.body ?? {})));
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
