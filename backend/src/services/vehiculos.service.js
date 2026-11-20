const { db } = require('../db');
const { errores } = require('../utils/errores');
const { programacionesVigentesDe } = require('./impacto.service');

const COLUMNAS = [
  'id', 'placa', 'tipo', 'marca', 'modelo', 'anio', 'capacidad_kg',
  'estado_operativo', 'activo', 'observaciones', 'creado_en', 'actualizado_en',
];

async function listar({ q, estado_operativo, activo }) {
  const consulta = db('vehiculos').select(COLUMNAS).orderBy('placa');
  if (q) {
    const patron = `%${q}%`;
    consulta.where((w) => w.whereILike('placa', patron).orWhereILike('marca', patron).orWhereILike('modelo', patron));
  }
  if (estado_operativo) consulta.where({ estado_operativo });
  if (activo !== undefined) consulta.where({ activo });
  const datos = await consulta;
  return { datos, total: datos.length };
}

async function obtener(id) {
  const vehiculo = await db('vehiculos').where({ id }).first(COLUMNAS);
  if (!vehiculo) throw errores.noEncontrado('El vehículo no existe.');
  return vehiculo;
}

async function crear(datos) {
  const [vehiculo] = await db('vehiculos').insert(datos).returning(COLUMNAS);
  return vehiculo;
}

async function advertenciasDeDisponibilidad(id, vehiculo) {
  const noDisponible = !vehiculo.activo || !['DISPONIBLE', 'EN_SERVICIO'].includes(vehiculo.estado_operativo);
  if (!noDisponible) return [];
  const afectadas = await programacionesVigentesDe({ vehiculo_id: id });
  if (!afectadas.length) return [];
  return [
    `El vehículo ${vehiculo.placa} tiene ${afectadas.length} programación(es) activa(s). ` +
      'Reasigna otro vehículo a esas programaciones.',
  ];
}

async function actualizar(id, datos) {
  await obtener(id);
  const [vehiculo] = await db('vehiculos').where({ id }).update(datos).returning(COLUMNAS);
  return { ...vehiculo, advertencias: await advertenciasDeDisponibilidad(id, vehiculo) };
}

async function cambiarActivo(id, activo) {
  await obtener(id);
  const [vehiculo] = await db('vehiculos').where({ id }).update({ activo }).returning(COLUMNAS);
  return { ...vehiculo, advertencias: await advertenciasDeDisponibilidad(id, vehiculo) };
}

async function cambiarEstado(id, estado_operativo) {
  await obtener(id);
  const [vehiculo] = await db('vehiculos').where({ id }).update({ estado_operativo }).returning(COLUMNAS);
  return { ...vehiculo, advertencias: await advertenciasDeDisponibilidad(id, vehiculo) };
}

module.exports = { listar, obtener, crear, actualizar, cambiarActivo, cambiarEstado };
