// Fechas en la zona horaria de la operación (Buenaventura, Colombia).
const ZONA = 'America/Bogota';

/** Fecha de hoy en Colombia como 'AAAA-MM-DD'. */
function hoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** Día ISO de la semana (1 = lunes ... 7 = domingo) de una fecha 'AAAA-MM-DD'. */
function diaSemanaIso(fecha) {
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return dia === 0 ? 7 : dia;
}

const NOMBRES_DIAS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

module.exports = { ZONA, hoy, diaSemanaIso, NOMBRES_DIAS };
