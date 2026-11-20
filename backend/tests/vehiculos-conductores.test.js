// Entrega 2: vehículos, conductores e indicadores del dashboard.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, prepararBaseDatos, cerrarBaseDatos, tokenAdmin, fechaRelativa } = require('./helpers');

let token;
const auth = () => ({ Authorization: `Bearer ${token}` });

const vehiculoBase = {
  placa: 'ABC123',
  tipo: 'COMPACTADOR',
  marca: 'Chevrolet',
  modelo: 'NPR',
  anio: 2021,
  capacidad_kg: 7000,
  estado_operativo: 'DISPONIBLE',
};

const conductorBase = {
  nombres: 'Ana María',
  apellidos: 'Perea Riascos',
  tipo_documento: 'CC',
  numero_documento: '1234567890',
  telefono: '3101234567',
  email: 'Ana@Correo.com',
  licencia_numero: 'LIC9001',
  licencia_categoria: 'C2',
  licencia_vencimiento: fechaRelativa(365),
  estado: 'ACTIVO',
};

describe('Vehículos', () => {
  before(async () => {
    await prepararBaseDatos();
    token = await tokenAdmin();
  });

  let id;

  it('registra un vehículo', async () => {
    const res = await api.post('/api/vehiculos').set(auth()).send(vehiculoBase);
    assert.equal(res.status, 201);
    assert.equal(res.body.placa, 'ABC123');
    assert.equal(res.body.activo, true);
    id = res.body.id;
  });

  it('normaliza la placa y no permite repetirla', async () => {
    const res = await api.post('/api/vehiculos').set(auth()).send({ ...vehiculoBase, placa: 'abc-123' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.campos.placa, 'Ya existe un vehículo con esa placa.');
  });

  it('muestra errores de validación comprensibles', async () => {
    const res = await api
      .post('/api/vehiculos')
      .set(auth())
      .send({ ...vehiculoBase, placa: '12', estado_operativo: 'VOLANDO', anio: 1900, marca: '' });
    assert.equal(res.status, 400);
    assert.match(res.body.error.campos.placa, /formato ABC123/);
    assert.match(res.body.error.campos.estado_operativo, /DISPONIBLE, EN_SERVICIO, MANTENIMIENTO, FUERA_DE_SERVICIO/);
    assert.match(res.body.error.campos.anio, /1980/);
    assert.ok(res.body.error.campos.marca);
  });

  it('lista, filtra y consulta', async () => {
    const lista = await api.get('/api/vehiculos?q=abc').set(auth());
    assert.equal(lista.status, 200);
    assert.equal(lista.body.total, 1);
    const filtro = await api.get('/api/vehiculos?estado_operativo=MANTENIMIENTO').set(auth());
    assert.ok(filtro.body.datos.every((v) => v.estado_operativo === 'MANTENIMIENTO'));
    const uno = await api.get(`/api/vehiculos/${id}`).set(auth());
    assert.equal(uno.body.modelo, 'NPR');
    const noExiste = await api.get('/api/vehiculos/99999').set(auth());
    assert.equal(noExiste.status, 404);
  });

  it('edita y cambia el estado operativo', async () => {
    const res = await api.put(`/api/vehiculos/${id}`).set(auth()).send({ ...vehiculoBase, modelo: 'NQR', anio: '' });
    assert.equal(res.status, 200);
    assert.equal(res.body.modelo, 'NQR');
    assert.equal(res.body.anio, null);
    const estado = await api.patch(`/api/vehiculos/${id}/estado`).set(auth()).send({ estado_operativo: 'MANTENIMIENTO' });
    assert.equal(estado.body.estado_operativo, 'MANTENIMIENTO');
  });

  it('desactiva y reactiva', async () => {
    const off = await api.patch(`/api/vehiculos/${id}/desactivar`).set(auth());
    assert.equal(off.body.activo, false);
    const on = await api.patch(`/api/vehiculos/${id}/activar`).set(auth());
    assert.equal(on.body.activo, true);
  });

  it('advierte cuando un vehículo programado deja de estar disponible', async () => {
    const res = await api.patch('/api/vehiculos/1/estado').set(auth()).send({ estado_operativo: 'MANTENIMIENTO' });
    assert.equal(res.status, 200);
    assert.equal(res.body.advertencias.length, 1);
    await api.patch('/api/vehiculos/1/estado').set(auth()).send({ estado_operativo: 'DISPONIBLE' });
  });
});

describe('Conductores', () => {
  let id;

  it('registra un conductor con categoría y vencimiento de licencia', async () => {
    const res = await api.post('/api/conductores').set(auth()).send(conductorBase);
    assert.equal(res.status, 201);
    assert.equal(res.body.email, 'ana@correo.com');
    assert.equal(res.body.licencia_categoria, 'C2');
    assert.equal(res.body.licencia_vencimiento, conductorBase.licencia_vencimiento);
    assert.equal(res.body.estado, 'ACTIVO');
    id = res.body.id;
  });

  it('no permite documento ni licencia repetidos', async () => {
    const doc = await api.post('/api/conductores').set(auth()).send({ ...conductorBase, licencia_numero: 'OTRA123' });
    assert.equal(doc.status, 409);
    assert.ok(doc.body.error.campos.numero_documento);

    const lic = await api
      .post('/api/conductores')
      .set(auth())
      .send({ ...conductorBase, numero_documento: '9876543210', licencia_numero: 'lic-9001' });
    assert.equal(lic.status, 409);
    assert.ok(lic.body.error.campos.licencia_numero);

    const ambos = await api.post('/api/conductores').set(auth()).send(conductorBase);
    assert.equal(ambos.status, 409);
    assert.ok(ambos.body.error.campos.numero_documento, 'marca el documento');
    assert.ok(ambos.body.error.campos.licencia_numero, 'y también la licencia');
  });

  it('valida la cédula, la categoría y la fecha', async () => {
    const res = await api
      .post('/api/conductores')
      .set(auth())
      .send({ ...conductorBase, numero_documento: 'AB12', licencia_categoria: 'Z9', licencia_vencimiento: '2026-02-30' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.campos.numero_documento);
    assert.ok(res.body.error.campos.licencia_categoria);
    assert.match(res.body.error.campos.licencia_vencimiento, /fecha válida/);
  });

  it('advierte si se registra con la licencia vencida', async () => {
    const res = await api
      .post('/api/conductores')
      .set(auth())
      .send({ ...conductorBase, numero_documento: '5555555', licencia_numero: 'LIC5555', licencia_vencimiento: fechaRelativa(-1), email: '' });
    assert.equal(res.status, 201);
    assert.equal(res.body.licencia_vencida, true);
    assert.equal(res.body.advertencias.length, 1);
  });

  it('edita, cambia estado, desactiva y lista', async () => {
    const edit = await api.put(`/api/conductores/${id}`).set(auth()).send({ ...conductorBase, telefono: '' });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.telefono, null);
    const vac = await api.patch(`/api/conductores/${id}/estado`).set(auth()).send({ estado: 'VACACIONES' });
    assert.equal(vac.body.estado, 'VACACIONES');
    const off = await api.patch(`/api/conductores/${id}/desactivar`).set(auth());
    assert.equal(off.body.estado, 'INACTIVO');
    const lista = await api.get('/api/conductores?estado=INACTIVO').set(auth());
    assert.ok(lista.body.datos.some((c) => c.id === id));
  });
});

describe('Indicadores del dashboard (entrega 2)', () => {
  after(cerrarBaseDatos);

  it('se calculan con datos reales y cambian al actualizar', async () => {
    const antes = (await api.get('/api/dashboard').set(auth())).body.indicadores;
    await api.post('/api/vehiculos').set(auth()).send({ ...vehiculoBase, placa: 'XYZ987', estado_operativo: 'MANTENIMIENTO' });
    await api
      .post('/api/conductores')
      .set(auth())
      .send({ ...conductorBase, numero_documento: '7777777', licencia_numero: 'LIC7777' });
    const despues = (await api.get('/api/dashboard').set(auth())).body.indicadores;

    assert.equal(despues.vehiculos.total, antes.vehiculos.total + 1);
    assert.equal(despues.vehiculos.mantenimiento, antes.vehiculos.mantenimiento + 1);
    assert.equal(despues.vehiculos.disponibles, antes.vehiculos.disponibles);
    assert.equal(despues.conductores.total, antes.conductores.total + 1);
    assert.equal(despues.conductores.activos, antes.conductores.activos + 1);
  });
});
