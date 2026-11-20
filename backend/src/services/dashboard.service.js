// Indicadores del panel. Todo se calcula en el momento con datos reales de la
// base de datos: si cambian los datos, cambian los números.
const { db } = require('../db');
const { hoy } = require('../utils/fechas');
const servicios = require('./servicios.service');

const MODULOS = [
  { clave: 'vehiculos', nombre: 'Vehículos', ruta: '/vehiculos', descripcion: 'Flota, estados operativos y disponibilidad.' },
  { clave: 'conductores', nombre: 'Conductores', ruta: '/conductores', descripcion: 'Personal, licencias y estado.' },
  { clave: 'rutas', nombre: 'Rutas', ruta: '/rutas', descripcion: 'Recorridos en el mapa, barrios y estado.' },
  { clave: 'programacion', nombre: 'Programación', ruta: '/programacion', descripcion: 'Turnos y asignación del servicio.' },
];

async function indicadores() {
  const [vehiculos, conductores, rutas, programacion] = await Promise.all([
    db('vehiculos')
      .first(
        db.raw('count(*) AS total'),
        db.raw("count(*) FILTER (WHERE activo AND estado_operativo = 'DISPONIBLE') AS disponibles"),
        db.raw("count(*) FILTER (WHERE activo AND estado_operativo = 'EN_SERVICIO') AS en_servicio"),
        db.raw("count(*) FILTER (WHERE activo AND estado_operativo = 'MANTENIMIENTO') AS mantenimiento"),
        db.raw("count(*) FILTER (WHERE activo AND estado_operativo = 'FUERA_DE_SERVICIO') AS fuera_de_servicio"),
        db.raw('count(*) FILTER (WHERE NOT activo) AS inactivos'),
      ),
    db('conductores')
      .first(
        db.raw('count(*) AS total'),
        db.raw("count(*) FILTER (WHERE estado = 'ACTIVO') AS activos"),
        db.raw("count(*) FILTER (WHERE estado IN ('VACACIONES', 'INCAPACITADO')) AS ausentes"),
        db.raw("count(*) FILTER (WHERE estado = 'INACTIVO') AS inactivos"),
        db.raw("count(*) FILTER (WHERE estado <> 'INACTIVO' AND licencia_vencimiento < CURRENT_DATE) AS licencias_vencidas"),
        db.raw(`count(*) FILTER (WHERE estado <> 'INACTIVO'
                AND licencia_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS licencias_por_vencer`),
      ),
    db('rutas as r')
      .first(
        db.raw('count(*) AS total'),
        db.raw("count(*) FILTER (WHERE r.estado = 'ACTIVA') AS activas"),
        db.raw("count(*) FILTER (WHERE r.estado = 'SUSPENDIDA') AS suspendidas"),
        db.raw('count(*) FILTER (WHERE (SELECT count(*) FROM ruta_puntos p WHERE p.ruta_id = r.id) < 2) AS sin_trazado'),
      ),
    db('programaciones')
      .where('estado', 'ACTIVA')
      .where((w) => w.whereNull('fecha_fin').orWhere('fecha_fin', '>=', db.raw('CURRENT_DATE')))
      .first(db.raw('count(*) AS activas'), db.raw('count(DISTINCT ruta_id) AS rutas_programadas')),
  ]);

  return { vehiculos, conductores, rutas, programacion };
}

async function resumen(usuario) {
  const fecha = hoy();
  const [datos, delDia] = await Promise.all([indicadores(), servicios.listar({ fecha })]);
  const porEstado = { PROGRAMADO: 0, EN_CURSO: 0, COMPLETADO: 0, NO_REALIZADO: 0 };
  for (const s of delDia.datos) porEstado[s.estado] += 1;

  return {
    usuario,
    fecha,
    modulos: MODULOS,
    indicadores: {
      ...datos,
      servicios_hoy: { total: delDia.total, ...porEstado, con_alertas: delDia.datos.filter((s) => s.alertas.length).length },
    },
  };
}

module.exports = { resumen, indicadores, MODULOS };
