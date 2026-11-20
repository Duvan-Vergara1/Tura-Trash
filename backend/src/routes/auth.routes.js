const { Router } = require('express');
const { z } = require('../validators/comunes');
const auth = require('../services/auth.service');
const { requiereAutenticacion } = require('../middleware/auth');
const limite = require('../middleware/limiteIntentos');
const { errores } = require('../utils/errores');

const router = Router();

const esquemaLogin = z.object({
  email: z.string().trim().optional().default(''),
  password: z.string().optional().default(''),
});

router.post('/login', limite.verificarLimite, async (req, res) => {
  const { email, password } = esquemaLogin.parse(req.body ?? {});
  if (!email || !password) {
    const campos = {};
    if (!email) campos.email = 'Ingresa tu correo.';
    if (!password) campos.password = 'Ingresa tu contraseña.';
    throw errores.validacion('Ingresa tu correo y tu contraseña.', campos);
  }

  try {
    const resultado = await auth.iniciarSesion(
      { email, password },
      { ip: req.ip, agente: req.get('user-agent') },
    );
    limite.limpiar(req);
    res.json(resultado);
  } catch (error) {
    if (error.codigo === 'CREDENCIALES_INVALIDAS') limite.registrarFallo(req);
    throw error;
  }
});

router.post('/logout', requiereAutenticacion, async (req, res) => {
  await auth.cerrarSesion(req.sesionId);
  res.json({ mensaje: 'Cerraste sesión correctamente.' });
});

router.get('/me', requiereAutenticacion, (req, res) => {
  res.json({ usuario: req.usuario });
});

module.exports = router;
