const { Router } = require('express');
const { parametroId } = require('../validators/comunes');
const { esquemaRuta, esquemaTrazado, esquemaSuspension, filtrosRutas } = require('../validators/rutas');
const servicio = require('../services/rutas.service');

const router = Router();

router.get('/', async (req, res) => {
  res.json(await servicio.listar(filtrosRutas.parse(req.query)));
});

router.get('/:id', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await servicio.obtener(id));
});

router.post('/', async (req, res) => {
  res.status(201).json(await servicio.crear(esquemaRuta.parse(req.body ?? {})));
});

router.put('/:id', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await servicio.actualizar(id, esquemaRuta.parse(req.body ?? {})));
});

// Reemplaza el trazado completo (lista ordenada de puntos, del inicio al fin).
router.put('/:id/trazado', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  const { puntos } = esquemaTrazado.parse(req.body ?? {});
  res.json(await servicio.guardarTrazado(id, puntos));
});

router.patch('/:id/suspender', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  const { motivo } = esquemaSuspension.parse(req.body ?? {});
  res.json(await servicio.suspender(id, motivo));
});

router.patch('/:id/activar', async (req, res) => {
  const { id } = parametroId.parse(req.params);
  res.json(await servicio.activar(id));
});

module.exports = router;
