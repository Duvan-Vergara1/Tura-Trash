// Entrega 4: turnos, programación del servicio, validaciones y dashboard final.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, db, prepararBaseDatos, cerrarBaseDatos, tokenAdmin, fechaRelativa, hoy } = require('./helpers');
const { diaSemanaIso } = require('../src/utils/fechas');

let token;
const auth = () => ({ Authorization: `Bearer ${token}` });
let ids;

async function idDe(tabla, campo, valor) {
  return (await db(tabla).where(campo, valor).first('id')).id;
}

describe('Turnos', () => {
  before(async () => {
    await prepararBaseDatos();
    token = await tokenAdmin();
    ids = {
      rutaCentro: await idDe('rutas', 'nombre', 'Ruta Centro - Isla Cascajal'),
      rutaReciclaje: await idDe('rutas', 'nombre', 'Ruta Reciclaje Comuna Continental'),
      rutaSuspendida: await idDe('rutas', 'nombre', 'Ruta Orgánicos Plaza de Mercado'),
      rutaSinTrazado: await idDe('rutas', 'nombre', 'Ruta Especial Escombros'),
      vDisponible: await idDe('vehiculos', 'placa', 'TRB102'),
      vLibre: await idDe('vehiculos', 'placa', 'TRB103'),
      vMantenimiento: await idDe('vehiculos', 'placa', 'TRB104'),
      vInactivo: await idDe('vehiculos', 'placa', 'TRB106'),
      cOcupado: await idDe('conductores', 'numero_documento', '1111111112'),
      cLibre: await idDe('conductores', 'numero_documento', '1111111113'),
      cInactivo: await idDe('conductores', 'numero_documento', '1111111116'),
      cLicenciaVencida: await idDe('conductores', 'numero_documento', '1111111115'),
      tManana: await idDe('turnos', 'nombre', 'Mañana'),
    };
  });

  it('crea turnos con hora de inicio y finalización', async () => {
    const res = await api.post('/api/turnos').set(auth()).send({ nombre: 'Noche', hora_inicio: '22:00', hora_fin: '23:59' });
    assert.equal(res.status, 201);
    assert.equal(res.body.hora_inicio, '22:00');
    assert.equal(res.body.hora_fin, '23:59');
    ids.tNoche = res.body.id;
  });

  it('valida el horario', async () => {
    const res = await api.post('/api/turnos').set(auth()).send({ nombre: 'Malo', hora_inicio: '10:00', hora_fin: '09:00' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.campos.hora_fin);
    const formato = await api.post('/api/turnos').set(auth()).send({ nombre: 'Malo', hora_inicio: '25:00', hora_fin: '26:00' });
    assert.equal(formato.status, 400);
  });

  it('no deja cambiar el horario de un turno en uso', async () => {
    const res = await api.put(`/api/turnos/${ids.tManana}`).set(auth()).send({ nombre: 'Mañana', hora_inicio: '05:00', hora_fin: '13:00' });
    assert.equal(res.status, 422);
  });
});

describe('Programación del servicio', () => {
  after(cerrarBaseDatos);

  const base = () => ({
    ruta_id: ids.rutaReciclaje,
    vehiculo_id: ids.vLibre,
    conductor_id: ids.cLibre,
    turno_id: ids.tNoche,
    fecha_inicio: hoy(),
    fecha_fin: '',
    dias_semana: [1, 2, 3, 4, 5, 6, 7],
  });
  let id;

  it('programa una ruta con ruta, vehículo, conductor, turno, fecha y días', async () => {
    const res = await api.post('/api/programaciones').set(auth()).send({ ...base(), dias_semana: [5, 1, 3, 1] });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.estado, 'ACTIVA');
    assert.deepEqual(res.body.dias_semana, [1, 3, 5]);
    assert.equal(res.body.fecha_fin, null);
    assert.deepEqual(res.body.advertencias, [], 'licencia lejana: sin advertencias');
    id = res.body.id;
  });

  it('no asigna vehículos inactivos o en mantenimiento', async () => {
    const mant = await api.post('/api/programaciones').set(auth()).send({ ...base(), vehiculo_id: ids.vMantenimiento });
    assert.equal(mant.status, 422);
    assert.match(mant.body.error.mensaje, /mantenimiento/);
    const inac = await api.post('/api/programaciones').set(auth()).send({ ...base(), vehiculo_id: ids.vInactivo });
    assert.equal(inac.status, 422);
    assert.match(inac.body.error.mensaje, /inactivo/);
  });

  it('no asigna conductores inactivos ni con la licencia vencida', async () => {
    const inac = await api.post('/api/programaciones').set(auth()).send({ ...base(), conductor_id: ids.cInactivo });
    assert.equal(inac.status, 422);
    assert.match(inac.body.error.mensaje, /inactivo/);
    const lic = await api.post('/api/programaciones').set(auth()).send({ ...base(), conductor_id: ids.cLicenciaVencida });
    assert.equal(lic.status, 422);
    assert.match(lic.body.error.mensaje, /licencia/);
  });

  it('no programa rutas suspendidas o sin trazado', async () => {
    const susp = await api.post('/api/programaciones').set(auth()).send({ ...base(), ruta_id: ids.rutaSuspendida });
    assert.equal(susp.status, 422);
    assert.match(susp.body.error.mensaje, /suspendida/);
    const sin = await api.post('/api/programaciones').set(auth()).send({ ...base(), ruta_id: ids.rutaSinTrazado });
    assert.equal(sin.status, 422);
    assert.match(sin.body.error.mensaje, /trazado/);
  });

  it('no programa en fechas pasadas ni con días que no caen en el rango', async () => {
    const pasada = await api.post('/api/programaciones').set(auth()).send({ ...base(), fecha_inicio: fechaRelativa(-3) });
    assert.equal(pasada.status, 422);
    const inicio = fechaRelativa(1);
    const otroDia = (diaSemanaIso(inicio) % 7) + 1; // un día distinto al de "inicio"
    const sinDias = await api
      .post('/api/programaciones')
      .set(auth())
      .send({ ...base(), fecha_inicio: inicio, fecha_fin: inicio, dias_semana: [otroDia] });
    assert.equal(sinDias.status, 422);
    assert.ok(sinDias.body.error.campos.dias_semana);
  });

  it('advierte conflictos de vehículo (mismo día y horario)', async () => {
    const res = await api
      .post('/api/programaciones')
      .set(auth())
      .send({ ...base(), conductor_id: ids.cOcupado, dias_semana: [3] });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.detalles[0].tipo, 'vehiculo');
    assert.match(res.body.error.mensaje, /TRB103/);
  });

  it('advierte conflictos de conductor', async () => {
    // cOcupado ya tiene turno Mañana todos los días (datos de prueba).
    const res = await api
      .post('/api/programaciones')
      .set(auth())
      .send({ ...base(), vehiculo_id: ids.vDisponible, conductor_id: ids.cOcupado, turno_id: ids.tManana, ruta_id: ids.rutaCentro });
    assert.equal(res.status, 409);
    const tipos = res.body.error.detalles.map((d) => d.tipo);
    assert.ok(tipos.includes('conductor'));
    assert.ok(tipos.includes('vehiculo'));
  });

  it('no hay conflicto si los días u horarios no se cruzan', async () => {
    const otrosDias = await api
      .post('/api/programaciones/validar')
      .set(auth())
      .send({ ...base(), conductor_id: ids.cOcupado, dias_semana: [2, 4] });
    assert.equal(otrosDias.status, 200);
    assert.equal(otrosDias.body.valido, true, JSON.stringify(otrosDias.body));
    assert.equal(otrosDias.body.conflictos.length, 0);

    // Mañana termina a las 14:00; un turno 14:00-18:00 no se cruza.
    const turno = await api.post('/api/turnos').set(auth()).send({ nombre: 'Media tarde', hora_inicio: '14:00', hora_fin: '18:00' });
    const pegado = await api
      .post('/api/programaciones/validar')
      .set(auth())
      .send({ ...base(), vehiculo_id: ids.vDisponible, conductor_id: ids.cOcupado, turno_id: turno.body.id });
    assert.equal(pegado.body.conflictos.length, 0);
  });

  it('el endpoint /validar devuelve errores y conflictos sin guardar', async () => {
    const antes = await db('programaciones').count('* as n').first();
    const res = await api
      .post('/api/programaciones/validar')
      .set(auth())
      .send({ ...base(), vehiculo_id: ids.vMantenimiento, dias_semana: [1] });
    assert.equal(res.status, 200);
    assert.equal(res.body.valido, false);
    assert.ok(res.body.errores.some((e) => e.campo === 'vehiculo_id'));
    assert.ok(res.body.conflictos.some((c) => c.tipo === 'conductor'));
    const despues = await db('programaciones').count('* as n').first();
    assert.equal(despues.n, antes.n);
  });

  it('edita una programación (sin chocar consigo misma)', async () => {
    const res = await api
      .put(`/api/programaciones/${id}`)
      .set(auth())
      .send({ ...base(), dias_semana: [1, 3, 5, 6], fecha_fin: fechaRelativa(60), observaciones: 'Ajuste' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.dias_semana, [1, 3, 5, 6]);
    assert.equal(res.body.observaciones, 'Ajuste');
  });

  it('lista los servicios del día con ruta, conductor, vehículo, horario y estado, y filtra', async () => {
    const res = await api.get(`/api/servicios?fecha=${hoy()}`).set(auth());
    assert.equal(res.status, 200);
    assert.ok(res.body.total >= 2);
    const s = res.body.datos[0];
    for (const campo of ['ruta_nombre', 'conductor_nombre', 'vehiculo_placa', 'hora_inicio', 'hora_fin', 'estado']) {
      assert.ok(campo in s, campo);
    }
    const porVehiculo = await api.get(`/api/servicios?fecha=${hoy()}&vehiculo_id=${ids.vDisponible}`).set(auth());
    assert.ok(porVehiculo.body.datos.every((x) => x.vehiculo_id === ids.vDisponible));
    const porRuta = await api.get(`/api/servicios?fecha=${hoy()}&ruta_id=${ids.rutaCentro}`).set(auth());
    assert.ok(porRuta.body.datos.every((x) => x.ruta_id === ids.rutaCentro));
    const porConductor = await api.get(`/api/servicios?fecha=${hoy()}&conductor_id=${ids.cOcupado}`).set(auth());
    assert.ok(porConductor.body.datos.every((x) => x.conductor_id === ids.cOcupado));
  });

  it('actualiza el estado de un servicio del día', async () => {
    const [servicio] = (await api.get(`/api/servicios?fecha=${hoy()}`).set(auth())).body.datos;
    const res = await api
      .put(`/api/servicios/${servicio.programacion_id}/${hoy()}`)
      .set(auth())
      .send({ estado: 'EN_CURSO', observaciones: 'Salió a tiempo' });
    assert.equal(res.status, 200);
    assert.equal(res.body.estado, 'EN_CURSO');
    const futuro = await api
      .put(`/api/servicios/${servicio.programacion_id}/${fechaRelativa(7)}`)
      .set(auth())
      .send({ estado: 'COMPLETADO' });
    assert.equal(futuro.status, 422);
  });

  it('cancela (con motivo) y desactiva programaciones', async () => {
    const otra = await api
      .post('/api/programaciones')
      .set(auth())
      .send({ ...base(), conductor_id: ids.cOcupado, dias_semana: [2, 4] });
    assert.equal(otra.status, 201, JSON.stringify(otra.body));

    const sinMotivo = await api.patch(`/api/programaciones/${otra.body.id}/cancelar`).set(auth()).send({});
    assert.equal(sinMotivo.status, 400);
    const cancelada = await api.patch(`/api/programaciones/${otra.body.id}/cancelar`).set(auth()).send({ motivo: 'Ya no se necesita' });
    assert.equal(cancelada.body.estado, 'CANCELADA');
    const editar = await api.put(`/api/programaciones/${otra.body.id}`).set(auth()).send(base());
    assert.equal(editar.status, 422);

    const inactiva = await api.patch(`/api/programaciones/${id}/desactivar`).set(auth());
    assert.equal(inactiva.body.estado, 'INACTIVA');
    const activa = await api.patch(`/api/programaciones/${id}/activar`).set(auth());
    assert.equal(activa.body.estado, 'ACTIVA');
  });

  it('advierte (sin bloquear) si la licencia vence durante la programación', async () => {
    await db('conductores').where({ id: ids.cLibre }).update({ licencia_vencimiento: fechaRelativa(20) });
    const res = await api
      .post('/api/programaciones/validar')
      .set(auth())
      .send({ ...base(), turno_id: ids.tManana, vehiculo_id: ids.vLibre, dias_semana: [7] });
    assert.equal(res.body.errores.length, 0);
    assert.equal(res.body.advertencias.length, 1);
    assert.match(res.body.advertencias[0], /vence/);
  });

  it('el dashboard final muestra totales, rutas programadas y servicios del día', async () => {
    const res = await api.get('/api/dashboard').set(auth());
    const i = res.body.indicadores;
    for (const clave of ['total', 'disponibles', 'mantenimiento']) assert.equal(typeof i.vehiculos[clave], 'number');
    assert.equal(typeof i.conductores.activos, 'number');
    for (const clave of ['total', 'activas', 'suspendidas']) assert.equal(typeof i.rutas[clave], 'number');
    assert.ok(i.programacion.rutas_programadas >= 3);
    assert.ok(i.servicios_hoy.total >= 2);
    assert.equal(i.servicios_hoy.EN_CURSO, 1);
  });
});

