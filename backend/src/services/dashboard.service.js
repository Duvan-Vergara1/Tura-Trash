// Entrega 3: módulos + indicadores de vehículos, conductores y rutas, calculados
// en el momento con datos reales: si cambian los datos, cambian los números.
const { db } = require('../db');
const { hoy } = require('../utils/fechas');

const MODULOS = [
  { clave: 'vehiculos', nombre: 'Vehículos', ruta: '/vehiculos', descripcion: 'Flota, estados operativos y disponibilidad.' },
  { clave: 'conductores', nombre: 'Conductores', ruta: '/conductores', descripcion: 'Personal, licencias y estado.' },
  { clave: 'rutas', nombre: 'Rutas', ruta: '/rutas', descripcion: 'Recorridos en el mapa, barrios y estado.' },
  { clave: 'programacion', nombre: 'Programación', ruta: '/programacion', descripcion: 'Turnos y asignación del servicio.' },
];

async function indicadores() {
  const [vehiculos, conductores, rutas] = await Promise.all([
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
  ]);
  return { vehiculos, conductores, rutas };
}

async function resumen(usuario) {
  return { usuario, fecha: hoy(), modulos: MODULOS, indicadores: await indicadores() };
}

module.exports = { resumen, indicadores, MODULOS };
