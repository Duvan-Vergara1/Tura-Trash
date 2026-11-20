// Consultas compartidas: programaciones activas y vigentes (hoy o en el futuro)
// que dependen de un vehículo, conductor, ruta o turno. Sirven para advertir
// al administrador cuando un cambio afecta la operación.
const { db } = require('../db');

function programacionesVigentesDe(filtro) {
  return db('programaciones')
    .where(filtro)
    .where('estado', 'ACTIVA')
    .where((w) => w.whereNull('fecha_fin').orWhere('fecha_fin', '>=', db.raw('CURRENT_DATE')))
    .select('id');
}

module.exports = { programacionesVigentesDe };
