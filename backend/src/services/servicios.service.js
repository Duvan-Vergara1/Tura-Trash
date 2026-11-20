// Servicios del día: cada programación activa genera un servicio en cada fecha
// que cae en sus días de la semana. Si no hay fila en "servicios" para esa
// fecha, el servicio está PROGRAMADO.
const { db } = require('../db');
const { errores } = require('../utils/errores');
const { hoy, diaSemanaIso } = require('../utils/fechas');

function alertasDe(fila) {
  const alertas = [];
  if (fila.ruta_estado !== 'ACTIVA') alertas.push('La ruta está suspendida.');
  if (!fila.tiene_trazado) alertas.push('La ruta no tiene trazado.');
  if (!fila.vehiculo_activo) alertas.push('El vehículo está inactivo.');
  else if (['MANTENIMIENTO', 'FUERA_DE_SERVICIO'].includes(fila.vehiculo_estado)) {
    alertas.push(`El vehículo está ${fila.vehiculo_estado === 'MANTENIMIENTO' ? 'en mantenimiento' : 'fuera de servicio'}.`);
  }
  if (fila.conductor_estado !== 'ACTIVO') alertas.push(`El conductor está ${fila.conductor_estado.toLowerCase()}.`);
  else if (fila.licencia_vencimiento < fila.fecha) alertas.push('La licencia del conductor está vencida.');
  return alertas;
}

function consultaDelDia(fecha) {
  return db('programaciones as p')
    .join('rutas as r', 'r.id', 'p.ruta_id')
    .join('vehiculos as v', 'v.id', 'p.vehiculo_id')
    .join('conductores as c', 'c.id', 'p.conductor_id')
    .join('turnos as t', 't.id', 'p.turno_id')
    .leftJoin('servicios as s', function unir() {
      this.on('s.programacion_id', 'p.id').andOn('s.fecha', db.raw('?::date', [fecha]));
    })
    .where('p.estado', 'ACTIVA')
    .where('p.fecha_inicio', '<=', fecha)
    .where((w) => w.whereNull('p.fecha_fin').orWhere('p.fecha_fin', '>=', fecha))
    .whereRaw('?::int = ANY(p.dias_semana)', [diaSemanaIso(fecha)])
    .select(
      'p.id as programacion_id',
      db.raw('?::text AS fecha', [fecha]),
      'r.id as ruta_id', 'r.nombre as ruta_nombre', 'r.estado as ruta_estado', 'r.tipo_servicio',
      db.raw('(SELECT count(*) FROM ruta_puntos rp WHERE rp.ruta_id = r.id) >= 2 AS tiene_trazado'),
      'v.id as vehiculo_id', 'v.placa as vehiculo_placa', 'v.estado_operativo as vehiculo_estado', 'v.activo as vehiculo_activo',
      'c.id as conductor_id', db.raw("c.nombres || ' ' || c.apellidos AS conductor_nombre"),
      'c.estado as conductor_estado', 'c.licencia_vencimiento',
      't.id as turno_id', 't.nombre as turno_nombre',
      db.raw("to_char(t.hora_inicio, 'HH24:MI') AS hora_inicio"),
      db.raw("to_char(t.hora_fin, 'HH24:MI') AS hora_fin"),
      db.raw("COALESCE(s.estado, 'PROGRAMADO') AS estado"),
      's.observaciones',
    )
    .orderBy([{ column: 't.hora_inicio' }, { column: 'r.nombre' }]);
}

async function listar({ fecha = hoy(), ruta_id, vehiculo_id, conductor_id, estado }) {
  const consulta = consultaDelDia(fecha);
  if (ruta_id) consulta.where('r.id', ruta_id);
  if (vehiculo_id) consulta.where('v.id', vehiculo_id);
  if (conductor_id) consulta.where('c.id', conductor_id);
  if (estado) consulta.whereRaw("COALESCE(s.estado, 'PROGRAMADO') = ?", [estado]);
  const filas = await consulta;
  const datos = filas.map((f) => {
    const { licencia_vencimiento: _lic, ...resto } = f;
    return { ...resto, alertas: alertasDe(f) };
  });
  return { fecha, datos, total: datos.length };
}

async function cambiarEstado(programacionId, fecha, { estado, observaciones }, usuarioId) {
  const [servicio] = await consultaDelDia(fecha).where('p.id', programacionId);
  if (!servicio) {
    throw errores.reglaNegocio(
      'SERVICIO_INEXISTENTE',
      'Esa programación no tiene servicio en la fecha indicada (revisa que esté activa y que el día corresponda).',
    );
  }
  if (['EN_CURSO', 'COMPLETADO', 'NO_REALIZADO'].includes(estado) && fecha > hoy()) {
    throw errores.reglaNegocio('FECHA_FUTURA', 'No se puede marcar como iniciado o terminado un servicio de una fecha futura.');
  }
  await db('servicios')
    .insert({ programacion_id: programacionId, fecha, estado, observaciones, actualizado_por: usuarioId })
    .onConflict(['programacion_id', 'fecha'])
    .merge(['estado', 'observaciones', 'actualizado_por']);
  const [actualizado] = (await listar({ fecha })).datos.filter((s) => s.programacion_id === programacionId);
  return actualizado;
}

module.exports = { listar, cambiarEstado };
