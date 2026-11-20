const { db } = require('../db');
const { errores } = require('../utils/errores');
const { programacionesVigentesDe } = require('./impacto.service');

function base() {
  return db('turnos as t').select(
    't.id',
    't.nombre',
    db.raw("to_char(t.hora_inicio, 'HH24:MI') AS hora_inicio"),
    db.raw("to_char(t.hora_fin, 'HH24:MI') AS hora_fin"),
    't.activo',
    't.creado_en',
    't.actualizado_en',
    db.raw(`(SELECT count(*) FROM programaciones p
             WHERE p.turno_id = t.id AND p.estado = 'ACTIVA'
               AND (p.fecha_fin IS NULL OR p.fecha_fin >= CURRENT_DATE)) AS programaciones_activas`),
  );
}

async function listar({ activo }) {
  const consulta = base().orderBy('t.hora_inicio');
  if (activo !== undefined) consulta.where('t.activo', activo);
  const datos = await consulta;
  return { datos, total: datos.length };
}

async function obtener(id) {
  const turno = await base().where('t.id', id).first();
  if (!turno) throw errores.noEncontrado('El turno no existe.');
  return turno;
}

async function crear(datos) {
  const [{ id }] = await db('turnos').insert(datos).returning('id');
  return obtener(id);
}

async function actualizar(id, datos) {
  const anterior = await obtener(id);
  const cambiaHorario = anterior.hora_inicio !== datos.hora_inicio || anterior.hora_fin !== datos.hora_fin;
  if (cambiaHorario && anterior.programaciones_activas > 0) {
    throw errores.reglaNegocio(
      'TURNO_EN_USO',
      `No se puede cambiar el horario: el turno tiene ${anterior.programaciones_activas} programación(es) activa(s). ` +
        'Crea un turno nuevo o reprograma primero.',
      { campos: { hora_inicio: 'El turno está en uso.' } },
    );
  }
  await db('turnos').where({ id }).update(datos);
  return obtener(id);
}

async function cambiarActivo(id, activo) {
  await obtener(id);
  if (!activo) {
    const afectadas = await programacionesVigentesDe({ turno_id: id });
    if (afectadas.length) {
      throw errores.reglaNegocio(
        'TURNO_EN_USO',
        `No se puede desactivar: el turno tiene ${afectadas.length} programación(es) activa(s).`,
      );
    }
  }
  await db('turnos').where({ id }).update({ activo });
  return obtener(id);
}

module.exports = { listar, obtener, crear, actualizar, cambiarActivo };
