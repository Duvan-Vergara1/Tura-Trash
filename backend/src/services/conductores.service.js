const { db } = require('../db');
const { errores } = require('../utils/errores');
const { programacionesVigentesDe } = require('./impacto.service');

const COLUMNAS = [
  'id', 'nombres', 'apellidos', 'tipo_documento', 'numero_documento', 'telefono', 'email',
  'licencia_numero', 'licencia_categoria', 'licencia_vencimiento', 'estado', 'creado_en', 'actualizado_en',
  db.raw('(licencia_vencimiento < CURRENT_DATE) AS licencia_vencida'),
];

async function listar({ q, estado }) {
  const consulta = db('conductores').select(COLUMNAS).orderBy(['apellidos', 'nombres']);
  if (q) {
    const patron = `%${q}%`;
    consulta.where((w) =>
      w
        .whereILike('nombres', patron)
        .orWhereILike('apellidos', patron)
        .orWhereILike('numero_documento', patron)
        .orWhereILike('licencia_numero', patron),
    );
  }
  if (estado) consulta.where({ estado });
  const datos = await consulta;
  return { datos, total: datos.length };
}

async function obtener(id) {
  const conductor = await db('conductores').where({ id }).first(COLUMNAS);
  if (!conductor) throw errores.noEncontrado('El conductor no existe.');
  return conductor;
}

function advertenciasLicencia(conductor) {
  return conductor.licencia_vencida
    ? [`La licencia de ${conductor.nombres} ${conductor.apellidos} está vencida; no podrá ser programado.`]
    : [];
}

async function advertenciasDeEstado(id, conductor) {
  const advertencias = advertenciasLicencia(conductor);
  if (conductor.estado !== 'ACTIVO') {
    const afectadas = await programacionesVigentesDe({ conductor_id: id });
    if (afectadas.length) {
      advertencias.push(
        `${conductor.nombres} ${conductor.apellidos} tiene ${afectadas.length} programación(es) activa(s). ` +
          'Reasigna otro conductor a esas programaciones.',
      );
    }
  }
  return advertencias;
}

/** Revisa documento y licencia a la vez para marcar todos los campos repetidos. */
async function verificarDuplicados(datos, excluirId = 0) {
  const existentes = await db('conductores')
    .whereNot('id', excluirId)
    .where((w) => w.where('numero_documento', datos.numero_documento).orWhere('licencia_numero', datos.licencia_numero))
    .select('numero_documento', 'licencia_numero');
  const campos = {};
  if (existentes.some((c) => c.numero_documento === datos.numero_documento)) {
    campos.numero_documento = 'Ya existe un conductor con ese número de documento.';
  }
  if (existentes.some((c) => c.licencia_numero === datos.licencia_numero)) {
    campos.licencia_numero = 'Ya existe un conductor con ese número de licencia.';
  }
  if (Object.keys(campos).length) {
    throw errores.conflicto(Object.values(campos).join(' '), { campos });
  }
}

async function crear(datos) {
  await verificarDuplicados(datos);
  const [{ id }] = await db('conductores').insert(datos).returning('id');
  const conductor = await obtener(id);
  return { ...conductor, advertencias: advertenciasLicencia(conductor) };
}

async function actualizar(id, datos) {
  await obtener(id);
  await verificarDuplicados(datos, id);
  await db('conductores').where({ id }).update(datos);
  const conductor = await obtener(id);
  return { ...conductor, advertencias: await advertenciasDeEstado(id, conductor) };
}

async function cambiarEstado(id, estado) {
  await obtener(id);
  await db('conductores').where({ id }).update({ estado });
  const conductor = await obtener(id);
  return { ...conductor, advertencias: await advertenciasDeEstado(id, conductor) };
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado };
