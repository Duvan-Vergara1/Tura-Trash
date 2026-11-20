/**
 * Datos de prueba para la operación: vehículos, conductores, barrios, rutas
 * con trazado sobre Buenaventura, turnos y programaciones.
 *
 * Son datos ficticios para demostrar el sistema (las coordenadas son
 * aproximadas). Las programaciones arrancan hace una semana para que el
 * dashboard siempre muestre servicios del día.
 */
const { distanciaRutaMetros } = require('../../src/utils/geo');
const { hoy } = require('../../src/utils/fechas');

/** Fecha 'AAAA-MM-DD' a N días de hoy (hora de Colombia). */
function fechaRelativa(dias) {
  const [a, m, d] = hoy().split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}

exports.seed = async function seed(knex) {
  // --- Vehículos -----------------------------------------------------------
  const vehiculos = await knex('vehiculos')
    .insert([
      { placa: 'TRB101', tipo: 'COMPACTADOR', marca: 'Chevrolet', modelo: 'FVR', anio: 2019, capacidad_kg: 9000, estado_operativo: 'DISPONIBLE' },
      { placa: 'TRB102', tipo: 'COMPACTADOR', marca: 'International', modelo: '4300', anio: 2018, capacidad_kg: 10000, estado_operativo: 'DISPONIBLE' },
      { placa: 'TRB103', tipo: 'VOLQUETA', marca: 'Kenworth', modelo: 'T370', anio: 2020, capacidad_kg: 12000, estado_operativo: 'EN_SERVICIO' },
      { placa: 'TRB104', tipo: 'CAMION', marca: 'Hino', modelo: 'Dutro', anio: 2017, capacidad_kg: 4500, estado_operativo: 'MANTENIMIENTO', observaciones: 'Cambio de embrague' },
      { placa: 'TRB105', tipo: 'COMPACTADOR', marca: 'Chevrolet', modelo: 'NQR', anio: 2015, capacidad_kg: 6000, estado_operativo: 'FUERA_DE_SERVICIO', observaciones: 'Motor averiado' },
      { placa: 'TRB106', tipo: 'MOTOCARRO', marca: 'Bajaj', modelo: 'RE Cargo', anio: 2022, capacidad_kg: 500, estado_operativo: 'DISPONIBLE', activo: false, observaciones: 'Dado de baja' },
    ])
    .returning(['id', 'placa']);
  const vehiculo = Object.fromEntries(vehiculos.map((v) => [v.placa, v.id]));

  // --- Conductores ---------------------------------------------------------
  const conductores = await knex('conductores')
    .insert([
      { nombres: 'Carlos Andrés', apellidos: 'Mosquera Riascos', tipo_documento: 'CC', numero_documento: '1111111111', telefono: '3001112233', licencia_numero: 'LIC0001', licencia_categoria: 'C2', licencia_vencimiento: fechaRelativa(700), estado: 'ACTIVO' },
      { nombres: 'Yeison', apellidos: 'Valencia Angulo', tipo_documento: 'CC', numero_documento: '1111111112', telefono: '3002223344', licencia_numero: 'LIC0002', licencia_categoria: 'C3', licencia_vencimiento: fechaRelativa(400), estado: 'ACTIVO' },
      { nombres: 'Luz Marina', apellidos: 'Caicedo Hurtado', tipo_documento: 'CC', numero_documento: '1111111113', telefono: '3003334455', licencia_numero: 'LIC0003', licencia_categoria: 'C2', licencia_vencimiento: fechaRelativa(900), estado: 'ACTIVO' },
      { nombres: 'Jhon Fredy', apellidos: 'Rentería Solís', tipo_documento: 'CC', numero_documento: '1111111114', telefono: '3004445566', licencia_numero: 'LIC0004', licencia_categoria: 'C1', licencia_vencimiento: fechaRelativa(250), estado: 'VACACIONES' },
      { nombres: 'Wilmer', apellidos: 'Obregón Cuero', tipo_documento: 'CC', numero_documento: '1111111115', telefono: '3005556677', licencia_numero: 'LIC0005', licencia_categoria: 'C2', licencia_vencimiento: fechaRelativa(-30), estado: 'ACTIVO' },
      { nombres: 'Pedro Pablo', apellidos: 'Grueso Valencia', tipo_documento: 'CC', numero_documento: '1111111116', telefono: '3006667788', licencia_numero: 'LIC0006', licencia_categoria: 'B3', licencia_vencimiento: fechaRelativa(500), estado: 'INACTIVO' },
    ])
    .returning(['id', 'numero_documento']);
  const conductor = Object.fromEntries(conductores.map((c) => [c.numero_documento, c.id]));

  // --- Barrios -------------------------------------------------------------
  const barrios = await knex('barrios')
    .insert([
      { nombre: 'Centro', zona: 'URBANA', descripcion: 'Zona comercial de la isla Cascajal' },
      { nombre: 'Pueblo Nuevo', zona: 'URBANA' },
      { nombre: 'La Playita', zona: 'URBANA' },
      { nombre: 'Bellavista', zona: 'URBANA' },
      { nombre: 'El Cristal', zona: 'URBANA' },
      { nombre: 'Juan XXIII', zona: 'URBANA' },
      { nombre: 'La Independencia', zona: 'URBANA' },
      { nombre: 'Bolívar', zona: 'URBANA' },
    ])
    .returning(['id', 'nombre']);
  const barrio = Object.fromEntries(barrios.map((b) => [b.nombre, b.id]));

  // --- Rutas y trazados ----------------------------------------------------
  const definiciones = [
    {
      ruta: { nombre: 'Ruta Centro - Isla Cascajal', descripcion: 'Recolección domiciliaria y comercial en el centro de la isla.', tipo_servicio: 'ORDINARIO', estado: 'ACTIVA' },
      barrios: ['Centro', 'Pueblo Nuevo', 'La Playita'],
      puntos: [[3.8912, -77.0806], [3.8905, -77.0785], [3.8898, -77.0762], [3.8893, -77.0738], [3.8889, -77.0712]],
    },
    {
      ruta: { nombre: 'Ruta Avenida Simón Bolívar', descripcion: 'Recorrido por la avenida principal en el continente.', tipo_servicio: 'ORDINARIO', estado: 'ACTIVA' },
      barrios: ['Bellavista', 'El Cristal', 'Juan XXIII'],
      puntos: [[3.8863, -77.0474], [3.8851, -77.0420], [3.8838, -77.0365], [3.8824, -77.0312], [3.8810, -77.0258]],
    },
    {
      ruta: { nombre: 'Ruta Reciclaje Comuna Continental', descripcion: 'Recolección selectiva de material aprovechable.', tipo_servicio: 'RECICLABLE', estado: 'ACTIVA' },
      barrios: ['La Independencia', 'Bolívar'],
      puntos: [[3.8790, -77.0250], [3.8776, -77.0201], [3.8761, -77.0150], [3.8749, -77.0102]],
    },
    {
      ruta: { nombre: 'Ruta Orgánicos Plaza de Mercado', descripcion: 'Residuos orgánicos de la plaza de mercado. Suspendida por obras.', tipo_servicio: 'ORGANICO', estado: 'SUSPENDIDA', motivo_suspension: 'Obras en la vía de acceso' },
      barrios: ['Centro'],
      puntos: [[3.8901, -77.0770], [3.8896, -77.0751], [3.8890, -77.0733]],
    },
    {
      ruta: { nombre: 'Ruta Especial Escombros', descripcion: 'Recolección especial bajo solicitud. Aún sin trazado definido.', tipo_servicio: 'ESPECIAL', estado: 'ACTIVA' },
      barrios: [],
      puntos: [],
    },
  ];

  const rutaIds = [];
  for (const def of definiciones) {
    const puntos = def.puntos.map(([latitud, longitud]) => ({ latitud, longitud }));
    const [{ id }] = await knex('rutas')
      .insert({ ...def.ruta, distancia_m: puntos.length >= 2 ? distanciaRutaMetros(puntos) : null })
      .returning('id');
    rutaIds.push(id);
    if (def.barrios.length) {
      await knex('ruta_barrios').insert(def.barrios.map((n) => ({ ruta_id: id, barrio_id: barrio[n] })));
    }
    if (puntos.length) {
      await knex('ruta_puntos').insert(puntos.map((p, i) => ({ ruta_id: id, orden: i + 1, ...p })));
    }
  }

  // --- Turnos --------------------------------------------------------------
  const turnos = await knex('turnos')
    .insert([
      { nombre: 'Mañana', hora_inicio: '06:00', hora_fin: '14:00' },
      { nombre: 'Tarde', hora_inicio: '14:00', hora_fin: '22:00' },
      { nombre: 'Madrugada', hora_inicio: '02:00', hora_fin: '06:00' },
    ])
    .returning(['id', 'nombre']);
  const turno = Object.fromEntries(turnos.map((t) => [t.nombre, t.id]));

  // --- Programaciones ------------------------------------------------------
  const admin = await knex('usuarios').where({ rol: 'ADMIN', activo: true }).first('id');
  const todosLosDias = [1, 2, 3, 4, 5, 6, 7];
  await knex('programaciones').insert([
    { ruta_id: rutaIds[0], vehiculo_id: vehiculo.TRB101, conductor_id: conductor['1111111111'], turno_id: turno['Mañana'], fecha_inicio: fechaRelativa(-7), dias_semana: todosLosDias, creado_por: admin.id },
    { ruta_id: rutaIds[1], vehiculo_id: vehiculo.TRB102, conductor_id: conductor['1111111112'], turno_id: turno['Mañana'], fecha_inicio: fechaRelativa(-7), dias_semana: todosLosDias, creado_por: admin.id },
    { ruta_id: rutaIds[2], vehiculo_id: vehiculo.TRB101, conductor_id: conductor['1111111113'], turno_id: turno['Tarde'], fecha_inicio: fechaRelativa(-7), dias_semana: [1, 3, 5], creado_por: admin.id },
    { ruta_id: rutaIds[0], vehiculo_id: vehiculo.TRB103, conductor_id: conductor['1111111112'], turno_id: turno['Tarde'], fecha_inicio: fechaRelativa(-14), fecha_fin: fechaRelativa(-8), dias_semana: [2, 4], estado: 'CANCELADA', motivo_cancelacion: 'Cambio de cronograma', creado_por: admin.id },
  ]);
};
