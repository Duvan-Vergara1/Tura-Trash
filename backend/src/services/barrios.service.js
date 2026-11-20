const { db } = require('../db');
const { errores } = require('../utils/errores');

const COLUMNAS = ['b.id', 'b.nombre', 'b.comuna', 'b.zona', 'b.descripcion', 'b.activo', 'b.creado_en', 'b.actualizado_en'];

function base() {
  return db('barrios as b')
    .select(COLUMNAS)
    .select(db.raw('(SELECT count(*) FROM ruta_barrios rb WHERE rb.barrio_id = b.id) AS total_rutas'));
}

async function listar({ q, activo }) {
  const consulta = base().orderBy('b.nombre');
  if (q) consulta.whereILike('b.nombre', `%${q}%`);
  if (activo !== undefined) consulta.where('b.activo', activo);
  const datos = await consulta;
  return { datos, total: datos.length };
}

async function obtener(id) {
  const barrio = await base().where('b.id', id).first();
  if (!barrio) throw errores.noEncontrado('El barrio no existe.');
  return barrio;
}

async function crear(datos) {
  const [{ id }] = await db('barrios').insert(datos).returning('id');
  return obtener(id);
}

async function actualizar(id, datos) {
  await obtener(id);
  await db('barrios').where({ id }).update(datos);
  return obtener(id);
}

async function cambiarActivo(id, activo) {
  await obtener(id);
  await db('barrios').where({ id }).update({ activo });
  return obtener(id);
}

module.exports = { listar, obtener, crear, actualizar, cambiarActivo };
