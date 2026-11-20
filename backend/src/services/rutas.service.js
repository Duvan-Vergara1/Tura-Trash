const { db } = require('../db');
const { errores } = require('../utils/errores');
const { distanciaRutaMetros } = require('../utils/geo');
const { programacionesVigentesDe } = require('./impacto.service');

const COLUMNAS = [
  'r.id', 'r.nombre', 'r.descripcion', 'r.tipo_servicio', 'r.estado', 'r.motivo_suspension',
  'r.distancia_m', 'r.creado_en', 'r.actualizado_en',
];

function base() {
  return db('rutas as r')
    .select(COLUMNAS)
    .select(
      db.raw('(SELECT count(*) FROM ruta_puntos p WHERE p.ruta_id = r.id) AS total_puntos'),
      db.raw(`(SELECT count(*) FROM programaciones pr
               WHERE pr.ruta_id = r.id AND pr.estado = 'ACTIVA'
                 AND (pr.fecha_fin IS NULL OR pr.fecha_fin >= CURRENT_DATE)) AS programaciones_activas`),
      db.raw(`COALESCE((SELECT json_agg(json_build_object('id', b.id, 'nombre', b.nombre) ORDER BY b.nombre)
               FROM ruta_barrios rb JOIN barrios b ON b.id = rb.barrio_id
               WHERE rb.ruta_id = r.id), '[]'::json) AS barrios`),
    );
}

function conTrazado(ruta) {
  return { ...ruta, tiene_trazado: ruta.total_puntos >= 2 };
}

async function listar({ q, estado, tipo_servicio }) {
  const consulta = base().orderBy('r.nombre');
  if (q) consulta.where((w) => w.whereILike('r.nombre', `%${q}%`).orWhereILike('r.descripcion', `%${q}%`));
  if (estado) consulta.where('r.estado', estado);
  if (tipo_servicio) consulta.where('r.tipo_servicio', tipo_servicio);
  const datos = (await consulta).map(conTrazado);
  return { datos, total: datos.length };
}

async function obtener(id) {
  const fila = await base().where('r.id', id).first();
  if (!fila) throw errores.noEncontrado('La ruta no existe.');
  const puntos = await db('ruta_puntos')
    .where({ ruta_id: id })
    .orderBy('orden')
    .select('orden', 'latitud', 'longitud');
  return { ...conTrazado(fila), puntos };
}

async function validarBarrios(trx, barrioIds) {
  if (!barrioIds.length) return;
  const existentes = await trx('barrios').whereIn('id', barrioIds).pluck('id');
  const faltantes = barrioIds.filter((id) => !existentes.includes(id));
  if (faltantes.length) {
    throw errores.validacion('Algunos barrios no existen.', { barrio_ids: `Barrios inexistentes: ${faltantes.join(', ')}.` });
  }
}

async function guardarBarrios(trx, rutaId, barrioIds) {
  await validarBarrios(trx, barrioIds);
  await trx('ruta_barrios').where({ ruta_id: rutaId }).del();
  if (barrioIds.length) {
    await trx('ruta_barrios').insert(barrioIds.map((barrio_id) => ({ ruta_id: rutaId, barrio_id })));
  }
}

async function guardarPuntos(trx, rutaId, puntos) {
  await trx('ruta_puntos').where({ ruta_id: rutaId }).del();
  if (puntos.length) {
    await trx('ruta_puntos').insert(puntos.map((p, i) => ({ ruta_id: rutaId, orden: i + 1, ...p })));
  }
  await trx('rutas')
    .where({ id: rutaId })
    .update({ distancia_m: puntos.length >= 2 ? distanciaRutaMetros(puntos) : null });
}

async function crear(datos) {
  const { barrio_ids: barrioIds, puntos, ...ruta } = datos;
  if (ruta.estado === 'ACTIVA') ruta.motivo_suspension = null;
  const id = await db.transaction(async (trx) => {
    const [{ id: nuevoId }] = await trx('rutas').insert(ruta).returning('id');
    await guardarBarrios(trx, nuevoId, barrioIds);
    if (puntos) await guardarPuntos(trx, nuevoId, puntos);
    return nuevoId;
  });
  return obtener(id);
}

async function advertenciasSuspension(id, ruta) {
  if (ruta.estado === 'ACTIVA' && ruta.tiene_trazado) return [];
  const afectadas = await programacionesVigentesDe({ ruta_id: id });
  if (!afectadas.length) return [];
  const motivo = ruta.estado !== 'ACTIVA' ? 'está suspendida' : 'no tiene trazado';
  return [`La ruta ${motivo} y tiene ${afectadas.length} programación(es) activa(s) que no podrán ejecutarse.`];
}

async function actualizar(id, datos) {
  await obtener(id);
  const { barrio_ids: barrioIds, puntos, ...ruta } = datos;
  if (ruta.estado === 'ACTIVA') ruta.motivo_suspension = null;
  await db.transaction(async (trx) => {
    await trx('rutas').where({ id }).update(ruta);
    await guardarBarrios(trx, id, barrioIds);
    if (puntos) await guardarPuntos(trx, id, puntos);
  });
  const actualizada = await obtener(id);
  return { ...actualizada, advertencias: await advertenciasSuspension(id, actualizada) };
}

async function guardarTrazado(id, puntos) {
  await obtener(id);
  await db.transaction((trx) => guardarPuntos(trx, id, puntos));
  const ruta = await obtener(id);
  return { ...ruta, advertencias: await advertenciasSuspension(id, ruta) };
}

async function suspender(id, motivo) {
  await obtener(id);
  await db('rutas').where({ id }).update({ estado: 'SUSPENDIDA', motivo_suspension: motivo });
  const ruta = await obtener(id);
  return { ...ruta, advertencias: await advertenciasSuspension(id, ruta) };
}

async function activar(id) {
  await obtener(id);
  await db('rutas').where({ id }).update({ estado: 'ACTIVA', motivo_suspension: null });
  const ruta = await obtener(id);
  const advertencias = ruta.tiene_trazado
    ? []
    : ['La ruta está activa pero aún no tiene trazado; no se podrá programar hasta dibujar el recorrido.'];
  return { ...ruta, advertencias };
}

module.exports = { listar, obtener, crear, actualizar, guardarTrazado, suspender, activar };
