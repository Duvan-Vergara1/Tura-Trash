// Entrega 3: barrios, rutas y trazado en el mapa.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, prepararBaseDatos, cerrarBaseDatos, tokenAdmin } = require('./helpers');

let token;
const auth = () => ({ Authorization: `Bearer ${token}` });

const trazado = [
  { latitud: 3.8863, longitud: -77.0474 },
  { latitud: 3.8851, longitud: -77.042 },
  { latitud: 3.8838, longitud: -77.0365 },
];

describe('Barrios', () => {
  before(async () => {
    await prepararBaseDatos();
    token = await tokenAdmin();
  });

  let id;

  it('registra, lista y edita barrios', async () => {
    const nuevo = await api.post('/api/barrios').set(auth()).send({ nombre: 'Lleras', comuna: 3, zona: 'URBANA' });
    assert.equal(nuevo.status, 201);
    id = nuevo.body.id;

    const lista = await api.get('/api/barrios?q=ller').set(auth());
    assert.equal(lista.body.total, 1);

    const edit = await api.put(`/api/barrios/${id}`).set(auth()).send({ nombre: 'Barrio Lleras', comuna: '', descripcion: 'Sector de prueba' });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.nombre, 'Barrio Lleras');
    assert.equal(edit.body.comuna, null);
  });

  it('no repite nombres (sin importar mayúsculas) y valida la comuna', async () => {
    const dup = await api.post('/api/barrios').set(auth()).send({ nombre: 'barrio lleras' });
    assert.equal(dup.status, 409);
    const comuna = await api.post('/api/barrios').set(auth()).send({ nombre: 'Otro', comuna: 15 });
    assert.equal(comuna.status, 400);
    assert.ok(comuna.body.error.campos.comuna);
  });
});

describe('Rutas y mapa', () => {
  after(cerrarBaseDatos);

  let id;

  it('crea una ruta con nombre, descripción, tipo de servicio, estado, barrios y trazado', async () => {
    const res = await api
      .post('/api/rutas')
      .set(auth())
      .send({
        nombre: 'Ruta de prueba',
        descripcion: 'Recorrido usado en las pruebas',
        tipo_servicio: 'RECICLABLE',
        barrio_ids: [1, 2, 2],
        puntos: trazado,
      });
    assert.equal(res.status, 201);
    assert.equal(res.body.estado, 'ACTIVA');
    assert.equal(res.body.barrios.length, 2);
    assert.equal(res.body.tiene_trazado, true);
    assert.ok(res.body.distancia_m > 1000);
    id = res.body.id;
  });

  it('reconstruye el recorrido en el mismo orden en que se guardó', async () => {
    const nuevo = [...trazado].reverse().concat([{ latitud: 3.881, longitud: -77.0258 }]);
    const guardar = await api.put(`/api/rutas/${id}/trazado`).set(auth()).send({ puntos: nuevo });
    assert.equal(guardar.status, 200);

    const res = await api.get(`/api/rutas/${id}`).set(auth());
    assert.equal(res.body.puntos.length, 4);
    res.body.puntos.forEach((p, i) => {
      assert.equal(p.orden, i + 1);
      assert.equal(p.latitud, nuevo[i].latitud);
      assert.equal(p.longitud, nuevo[i].longitud);
    });
  });

  it('rechaza trazados inválidos', async () => {
    const unPunto = await api.put(`/api/rutas/${id}/trazado`).set(auth()).send({ puntos: [trazado[0]] });
    assert.equal(unPunto.status, 400);
    const lejos = await api
      .put(`/api/rutas/${id}/trazado`)
      .set(auth())
      .send({ puntos: [trazado[0], { latitud: 4.711, longitud: -74.0721 }] });
    assert.equal(lejos.status, 400);
    assert.match(JSON.stringify(lejos.body.error.campos), /fuera del municipio/);
  });

  it('valida campos obligatorios y nombre único', async () => {
    const vacia = await api.post('/api/rutas').set(auth()).send({});
    assert.equal(vacia.status, 400);
    assert.ok(vacia.body.error.campos.nombre);
    assert.ok(vacia.body.error.campos.descripcion);
    assert.ok(vacia.body.error.campos.tipo_servicio);

    const dup = await api
      .post('/api/rutas')
      .set(auth())
      .send({ nombre: 'RUTA DE PRUEBA', descripcion: 'Duplicada', tipo_servicio: 'ORDINARIO' });
    assert.equal(dup.status, 409);
  });

  it('suspende (con motivo) y vuelve a activar', async () => {
    const sinMotivo = await api.patch(`/api/rutas/${id}/suspender`).set(auth()).send({});
    assert.equal(sinMotivo.status, 400);
    const susp = await api.patch(`/api/rutas/${id}/suspender`).set(auth()).send({ motivo: 'Vía cerrada' });
    assert.equal(susp.body.estado, 'SUSPENDIDA');
    assert.equal(susp.body.motivo_suspension, 'Vía cerrada');
    const act = await api.patch(`/api/rutas/${id}/activar`).set(auth());
    assert.equal(act.body.estado, 'ACTIVA');
    assert.equal(act.body.motivo_suspension, null);
  });

  it('edita la ruta y lista con filtros', async () => {
    const edit = await api
      .put(`/api/rutas/${id}`)
      .set(auth())
      .send({ nombre: 'Ruta de prueba editada', descripcion: 'Nueva descripción', tipo_servicio: 'ORGANICO', barrio_ids: [] });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.barrios.length, 0);
    assert.equal(edit.body.tiene_trazado, true, 'editar sin enviar puntos conserva el trazado');

    const lista = await api.get('/api/rutas?estado=SUSPENDIDA').set(auth());
    assert.ok(lista.body.datos.every((r) => r.estado === 'SUSPENDIDA'));
  });

  it('el dashboard cuenta rutas, activas y suspendidas con datos reales', async () => {
    const antes = (await api.get('/api/dashboard').set(auth())).body.indicadores.rutas;
    await api.patch(`/api/rutas/${id}/suspender`).set(auth()).send({ motivo: 'Prueba' });
    const despues = (await api.get('/api/dashboard').set(auth())).body.indicadores.rutas;
    assert.equal(despues.total, antes.total);
    assert.equal(despues.activas, antes.activas - 1);
    assert.equal(despues.suspendidas, antes.suspendidas + 1);
  });
});
