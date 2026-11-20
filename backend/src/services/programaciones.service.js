// Programación del servicio: asigna ruta + vehículo + conductor + turno en
// unas fechas y días de la semana, con todas las reglas de la entrega 4:
// - No se asignan vehículos inactivos, en mantenimiento o fuera de servicio.
// - No se asignan conductores inactivos (ni de vacaciones, incapacitados o con
//   licencia vencida).
// - No se programan rutas suspendidas o sin trazado.
// - Se advierten los conflictos de conductor y vehículo (mismo día y horario).
const { db } = require('../db');
const { errores } = require('../utils/errores');
const { hoy, diaSemanaIso, NOMBRES_DIAS } = require('../utils/fechas');

const ETIQUETA_ESTADO_VEHICULO = {
  MANTENIMIENTO: 'está en mantenimiento',
  FUERA_DE_SERVICIO: 'está fuera de servicio',
};
const ETIQUETA_ESTADO_CONDUCTOR = {
  INACTIVO: 'está inactivo',
  VACACIONES: 'está de vacaciones',
  INCAPACITADO: 'está incapacitado',
};

function consultaBase() {
  return db('programaciones as p')
    .join('rutas as r', 'r.id', 'p.ruta_id')
    .join('vehiculos as v', 'v.id', 'p.vehiculo_id')
    .join('conductores as c', 'c.id', 'p.conductor_id')
    .join('turnos as t', 't.id', 'p.turno_id')
    .select(
      'p.id', 'p.ruta_id', 'p.vehiculo_id', 'p.conductor_id', 'p.turno_id',
      'p.fecha_inicio', 'p.fecha_fin', 'p.dias_semana', 'p.estado', 'p.motivo_cancelacion',
      'p.observaciones', 'p.creado_en', 'p.actualizado_en',
      'r.nombre as ruta_nombre', 'r.estado as ruta_estado', 'r.tipo_servicio',
      'v.placa as vehiculo_placa', 'v.estado_operativo as vehiculo_estado', 'v.activo as vehiculo_activo',
      db.raw("c.nombres || ' ' || c.apellidos AS conductor_nombre"),
      'c.estado as conductor_estado',
      't.nombre as turno_nombre',
      db.raw("to_char(t.hora_inicio, 'HH24:MI') AS hora_inicio"),
      db.raw("to_char(t.hora_fin, 'HH24:MI') AS hora_fin"),
    );
}

async function listar({ estado, ruta_id, vehiculo_id, conductor_id, turno_id, fecha }) {
  const consulta = consultaBase().orderBy([{ column: 'p.estado' }, { column: 'p.fecha_inicio', order: 'desc' }, { column: 't.hora_inicio' }]);
  if (estado) consulta.where('p.estado', estado);
  if (ruta_id) consulta.where('p.ruta_id', ruta_id);
  if (vehiculo_id) consulta.where('p.vehiculo_id', vehiculo_id);
  if (conductor_id) consulta.where('p.conductor_id', conductor_id);
  if (turno_id) consulta.where('p.turno_id', turno_id);
  if (fecha) {
    consulta
      .where('p.fecha_inicio', '<=', fecha)
      .where((w) => w.whereNull('p.fecha_fin').orWhere('p.fecha_fin', '>=', fecha))
      .whereRaw('?::int = ANY(p.dias_semana)', [diaSemanaIso(fecha)]);
  }
  const datos = await consulta;
  return { datos, total: datos.length };
}

async function obtener(id) {
  const programacion = await consultaBase().where('p.id', id).first();
  if (!programacion) throw errores.noEncontrado('La programación no existe.');
  return programacion;
}

const DIAS_AVISO_LICENCIA = 60;

function sumarDias(fecha, dias) {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** ¿Algún día de la lista cae entre las dos fechas? */
function hayDiaEnRango(inicio, fin, dias) {
  if (!fin) return true;
  const [a, m, d] = inicio.split('-').map(Number);
  for (let i = 0; i < 7; i += 1) {
    const f = new Date(Date.UTC(a, m - 1, d + i)).toISOString().slice(0, 10);
    if (f > fin) return false;
    if (dias.includes(diaSemanaIso(f))) return true;
  }
  return true;
}

async function buscarConflictos(datos, turno, excluirId) {
  // Programaciones activas que comparten vehículo o conductor, con algún día
  // real en común (fechas que se cruzan y mismo día de la semana) y con
  // horarios que se solapan. Basta revisar los primeros 7 días del cruce de
  // fechas para cubrir todos los días de la semana.
  const filas = await db.raw(
    `
    SELECT p.id, p.vehiculo_id, p.conductor_id, p.fecha_inicio, p.fecha_fin, p.dias_semana,
           r.nombre AS ruta_nombre, v.placa AS vehiculo_placa,
           c.nombres || ' ' || c.apellidos AS conductor_nombre,
           t.nombre AS turno_nombre,
           to_char(t.hora_inicio, 'HH24:MI') AS hora_inicio,
           to_char(t.hora_fin, 'HH24:MI') AS hora_fin
      FROM programaciones p
      JOIN turnos t ON t.id = p.turno_id
      JOIN rutas r ON r.id = p.ruta_id
      JOIN vehiculos v ON v.id = p.vehiculo_id
      JOIN conductores c ON c.id = p.conductor_id
     WHERE p.estado = 'ACTIVA'
       AND p.id <> :excluir
       AND (p.vehiculo_id = :vehiculo OR p.conductor_id = :conductor)
       AND t.hora_inicio < CAST(:horaFin AS time)
       AND CAST(:horaInicio AS time) < t.hora_fin
       AND EXISTS (
         SELECT 1
           FROM generate_series(
                  GREATEST(p.fecha_inicio, CAST(:inicio AS date)),
                  LEAST(COALESCE(p.fecha_fin, 'infinity'::date),
                        COALESCE(CAST(:fin AS date), 'infinity'::date),
                        GREATEST(p.fecha_inicio, CAST(:inicio AS date)) + 6),
                  interval '1 day') AS d
          WHERE extract(isodow FROM d)::int = ANY(p.dias_semana)
            AND extract(isodow FROM d)::int = ANY(CAST(:dias AS int[]))
       )
     ORDER BY p.id
    `,
    {
      excluir: excluirId || 0,
      vehiculo: datos.vehiculo_id,
      conductor: datos.conductor_id,
      horaInicio: turno.hora_inicio,
      horaFin: turno.hora_fin,
      inicio: datos.fecha_inicio,
      fin: datos.fecha_fin,
      dias: datos.dias_semana,
    },
  );

  const conflictos = [];
  for (const f of filas.rows) {
    const comunes = f.dias_semana.filter((d) => datos.dias_semana.includes(d)).map((d) => NOMBRES_DIAS[d]);
    const recurso = [];
    if (f.vehiculo_id === datos.vehiculo_id) recurso.push('vehiculo');
    if (f.conductor_id === datos.conductor_id) recurso.push('conductor');
    for (const tipo of recurso) {
      const quien = tipo === 'vehiculo' ? `El vehículo ${f.vehiculo_placa}` : `El conductor ${f.conductor_nombre}`;
      conflictos.push({
        tipo,
        programacion_id: f.id,
        ruta: f.ruta_nombre,
        turno: `${f.turno_nombre} (${f.hora_inicio} - ${f.hora_fin})`,
        dias: comunes,
        mensaje: `${quien} ya está programado en "${f.ruta_nombre}", turno ${f.turno_nombre} (${f.hora_inicio} - ${f.hora_fin}), los ${comunes.join(', ')}.`,
      });
    }
  }
  return conflictos;
}

/**
 * Revisa una programación sin guardarla. Devuelve los errores de reglas
 * (bloquean), los conflictos de horario (bloquean) y advertencias (no bloquean).
 */
async function evaluar(datos, { excluirId, esNueva } = {}) {
  const erroresRegla = [];
  const advertencias = [];
  const agregar = (campo, mensaje) => erroresRegla.push({ campo, mensaje });

  if (esNueva && datos.fecha_inicio < hoy()) {
    agregar('fecha_inicio', 'La fecha de inicio no puede ser anterior a hoy.');
  }
  if (!hayDiaEnRango(datos.fecha_inicio, datos.fecha_fin, datos.dias_semana)) {
    agregar('dias_semana', 'Entre la fecha de inicio y la de finalización no cae ninguno de los días seleccionados.');
  }

  const [ruta, vehiculo, conductor, turno] = await Promise.all([
    db('rutas as r')
      .where('r.id', datos.ruta_id)
      .first('r.id', 'r.nombre', 'r.estado', db.raw('(SELECT count(*) FROM ruta_puntos p WHERE p.ruta_id = r.id) AS total_puntos')),
    db('vehiculos').where({ id: datos.vehiculo_id }).first('id', 'placa', 'estado_operativo', 'activo'),
    db('conductores').where({ id: datos.conductor_id }).first('id', 'nombres', 'apellidos', 'estado', 'licencia_vencimiento'),
    db('turnos')
      .where({ id: datos.turno_id })
      .first('id', 'nombre', 'activo', db.raw("to_char(hora_inicio, 'HH24:MI') AS hora_inicio"), db.raw("to_char(hora_fin, 'HH24:MI') AS hora_fin")),
  ]);

  if (!ruta) agregar('ruta_id', 'La ruta no existe.');
  else if (ruta.estado !== 'ACTIVA') agregar('ruta_id', `No se puede programar la ruta "${ruta.nombre}" porque está suspendida.`);
  else if (ruta.total_puntos < 2) agregar('ruta_id', `No se puede programar la ruta "${ruta.nombre}" porque no tiene trazado en el mapa.`);

  if (!vehiculo) agregar('vehiculo_id', 'El vehículo no existe.');
  else if (!vehiculo.activo) agregar('vehiculo_id', `El vehículo ${vehiculo.placa} está inactivo.`);
  else if (ETIQUETA_ESTADO_VEHICULO[vehiculo.estado_operativo]) {
    agregar('vehiculo_id', `El vehículo ${vehiculo.placa} ${ETIQUETA_ESTADO_VEHICULO[vehiculo.estado_operativo]}.`);
  }

  if (!conductor) agregar('conductor_id', 'El conductor no existe.');
  else {
    const nombre = `${conductor.nombres} ${conductor.apellidos}`;
    if (ETIQUETA_ESTADO_CONDUCTOR[conductor.estado]) {
      agregar('conductor_id', `El conductor ${nombre} ${ETIQUETA_ESTADO_CONDUCTOR[conductor.estado]}.`);
    } else if (conductor.licencia_vencimiento < datos.fecha_inicio) {
      agregar('conductor_id', `La licencia de ${nombre} vence el ${conductor.licencia_vencimiento}, antes de la fecha de inicio.`);
    } else if (
      (datos.fecha_fin && conductor.licencia_vencimiento < datos.fecha_fin) ||
      (!datos.fecha_fin && conductor.licencia_vencimiento <= sumarDias(datos.fecha_inicio, DIAS_AVISO_LICENCIA))
    ) {
      // Solo avisa si la licencia vence durante la programación o pronto.
      advertencias.push(`La licencia de ${nombre} vence el ${conductor.licencia_vencimiento}, durante esta programación. Renuévala a tiempo.`);
    }
  }

  if (!turno) agregar('turno_id', 'El turno no existe.');
  else if (!turno.activo) agregar('turno_id', `El turno ${turno.nombre} está inactivo.`);

  const conflictos = turno && vehiculo && conductor ? await buscarConflictos(datos, turno, excluirId) : [];

  return {
    valido: erroresRegla.length === 0 && conflictos.length === 0,
    errores: erroresRegla,
    conflictos,
    advertencias,
  };
}

function lanzarSiInvalida(resultado) {
  if (resultado.errores.length) {
    const campos = {};
    for (const e of resultado.errores) if (!campos[e.campo]) campos[e.campo] = e.mensaje;
    throw errores.reglaNegocio('REGLA_PROGRAMACION', resultado.errores[0].mensaje, {
      campos,
      detalles: resultado.errores,
    });
  }
  if (resultado.conflictos.length) {
    throw errores.conflicto(
      `Hay ${resultado.conflictos.length} conflicto(s) de horario. ${resultado.conflictos[0].mensaje}`,
      { detalles: resultado.conflictos },
    );
  }
}

async function crear(datos, usuarioId) {
  const resultado = await evaluar(datos, { esNueva: true });
  lanzarSiInvalida(resultado);
  const [{ id }] = await db('programaciones')
    .insert({ ...datos, estado: 'ACTIVA', creado_por: usuarioId })
    .returning('id');
  return { ...(await obtener(id)), advertencias: resultado.advertencias };
}

async function actualizar(id, datos) {
  const actual = await obtener(id);
  if (actual.estado === 'CANCELADA') {
    throw errores.reglaNegocio('PROGRAMACION_CANCELADA', 'Una programación cancelada no se puede editar. Crea una nueva.');
  }
  let advertencias = [];
  if (actual.estado === 'ACTIVA') {
    const resultado = await evaluar(datos, { excluirId: id, esNueva: datos.fecha_inicio !== actual.fecha_inicio });
    lanzarSiInvalida(resultado);
    advertencias = resultado.advertencias;
  }
  await db('programaciones').where({ id }).update(datos);
  return { ...(await obtener(id)), advertencias };
}

async function cancelar(id, motivo) {
  const actual = await obtener(id);
  if (actual.estado === 'CANCELADA') {
    throw errores.reglaNegocio('PROGRAMACION_CANCELADA', 'La programación ya estaba cancelada.');
  }
  await db('programaciones').where({ id }).update({ estado: 'CANCELADA', motivo_cancelacion: motivo });
  return obtener(id);
}

async function desactivar(id) {
  const actual = await obtener(id);
  if (actual.estado !== 'ACTIVA') {
    throw errores.reglaNegocio('ESTADO_INVALIDO', 'Solo se puede desactivar una programación activa.');
  }
  await db('programaciones').where({ id }).update({ estado: 'INACTIVA' });
  return obtener(id);
}

async function activar(id) {
  const actual = await obtener(id);
  if (actual.estado !== 'INACTIVA') {
    throw errores.reglaNegocio('ESTADO_INVALIDO', 'Solo se puede reactivar una programación inactiva.');
  }
  const datos = {
    ruta_id: actual.ruta_id,
    vehiculo_id: actual.vehiculo_id,
    conductor_id: actual.conductor_id,
    turno_id: actual.turno_id,
    fecha_inicio: actual.fecha_inicio,
    fecha_fin: actual.fecha_fin,
    dias_semana: actual.dias_semana,
  };
  const resultado = await evaluar(datos, { excluirId: id });
  lanzarSiInvalida(resultado);
  await db('programaciones').where({ id }).update({ estado: 'ACTIVA' });
  return { ...(await obtener(id)), advertencias: resultado.advertencias };
}

module.exports = { listar, obtener, evaluar, crear, actualizar, cancelar, desactivar, activar };
