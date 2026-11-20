// Entrega 1: acceso administrativo.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { api, db, prepararBaseDatos, cerrarBaseDatos, tokenAdmin } = require('./helpers');
const { crearSesion } = require('../src/services/auth.service');

describe('Acceso administrativo', () => {
  before(prepararBaseDatos);
  after(cerrarBaseDatos);

  it('el health check responde y confirma la conexión con PostgreSQL', async () => {
    const res = await api.get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.estado, 'ok');
    assert.equal(res.body.baseDatos, 'conectada');
  });

  it('el administrador inicia sesión y recibe un token', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'ADMIN@turatrash.co ', password: 'Admin123*' });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.ok(res.body.expiraEn);
    assert.deepEqual(Object.keys(res.body.usuario).sort(), ['email', 'id', 'nombre', 'rol']);
    assert.equal(res.body.usuario.rol, 'ADMIN');
    const sesiones = await db('sesiones').whereNull('cerrada_en');
    assert.ok(sesiones.length >= 1, 'el login registra la sesión en la base de datos');
  });

  it('credenciales incorrectas producen un mensaje comprensible', async () => {
    const malaClave = await api.post('/api/auth/login').send({ email: 'admin@turatrash.co', password: 'otra' });
    assert.equal(malaClave.status, 401);
    assert.equal(malaClave.body.error.mensaje, 'Correo o contraseña incorrectos.');

    const noExiste = await api.post('/api/auth/login').send({ email: 'nadie@turatrash.co', password: 'Admin123*' });
    assert.equal(noExiste.status, 401);
    assert.equal(noExiste.body.error.mensaje, 'Correo o contraseña incorrectos.');
  });

  it('valida que lleguen correo y contraseña', async () => {
    const res = await api.post('/api/auth/login').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.error.mensaje, 'Ingresa tu correo y tu contraseña.');
    assert.ok(res.body.error.campos.email);
    assert.ok(res.body.error.campos.password);
  });

  it('una cuenta desactivada no puede entrar', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'inactivo@turatrash.co', password: 'Inactivo123*' });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.codigo, 'USUARIO_INACTIVO');
  });

  it('un usuario sin rol de administrador no puede entrar al panel', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'operador@turatrash.co', password: 'Operador123*' });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.mensaje, 'Esta cuenta no tiene permisos de administrador.');
  });

  it('el backend valida el rol aunque el token sea legítimo', async () => {
    const operador = await db('usuarios').where({ email: 'operador@turatrash.co' }).first();
    const { token } = await crearSesion(operador);
    const res = await api.get('/api/dashboard').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 403);
    assert.equal(res.body.error.codigo, 'SIN_PERMISOS');
  });

  it('sin token no se puede abrir el panel administrativo', async () => {
    for (const ruta of ['/api/dashboard', '/api/vehiculos', '/api/conductores', '/api/rutas', '/api/programaciones']) {
      const res = await api.get(ruta);
      assert.equal(res.status, 401, ruta);
      assert.equal(res.body.error.mensaje, 'Debes iniciar sesión para continuar.');
    }
  });

  it('un token alterado o firmado con otra clave es rechazado', async () => {
    const token = await tokenAdmin();
    const alterado = `${token.slice(0, -3)}abc`;
    const res1 = await api.get('/api/dashboard').set('Authorization', `Bearer ${alterado}`);
    assert.equal(res1.status, 401);
    assert.equal(res1.body.error.codigo, 'TOKEN_INVALIDO');

    const datos = jwt.decode(token);
    const falso = jwt.sign({ sid: datos.sid, rol: 'ADMIN' }, 'otra-clave', { subject: datos.sub });
    const res2 = await api.get('/api/dashboard').set('Authorization', `Bearer ${falso}`);
    assert.equal(res2.status, 401);
  });

  it('el administrador autenticado abre el dashboard con los 4 módulos', async () => {
    const token = await tokenAdmin();
    const res = await api.get('/api/dashboard').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.usuario.email, 'admin@turatrash.co');
    assert.deepEqual(
      res.body.modulos.map((m) => m.nombre),
      ['Vehículos', 'Conductores', 'Rutas', 'Programación'],
    );
  });

  it('/me devuelve el usuario de la sesión', async () => {
    const token = await tokenAdmin();
    const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.usuario.rol, 'ADMIN');
  });

  it('al cerrar sesión el token deja de servir', async () => {
    const token = await tokenAdmin();
    const salir = await api.post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    assert.equal(salir.status, 200);
    assert.equal(salir.body.mensaje, 'Cerraste sesión correctamente.');

    const despues = await api.get('/api/dashboard').set('Authorization', `Bearer ${token}`);
    assert.equal(despues.status, 401);
    assert.equal(despues.body.error.codigo, 'SESION_CERRADA');
  });

  it('si el usuario se desactiva, sus tokens dejan de servir', async () => {
    const token = await tokenAdmin();
    await db('usuarios').where({ email: 'admin@turatrash.co' }).update({ activo: false });
    const res = await api.get('/api/dashboard').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
    await db('usuarios').where({ email: 'admin@turatrash.co' }).update({ activo: true });
  });

  it('un endpoint inexistente responde 404 con el formato de error', async () => {
    const res = await api.get('/no-existe');
    assert.equal(res.status, 404);
    assert.ok(res.body.error.mensaje);

    const token = await tokenAdmin();
    const autenticado = await api.get('/api/no-existe').set('Authorization', `Bearer ${token}`);
    assert.equal(autenticado.status, 404);
  });
});
