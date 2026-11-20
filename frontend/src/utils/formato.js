// Etiquetas legibles para los valores que guarda el backend.

export const ESTADOS_VEHICULO = {
  DISPONIBLE: { texto: 'Disponible', tono: 'ok' },
  EN_SERVICIO: { texto: 'En servicio', tono: 'info' },
  MANTENIMIENTO: { texto: 'Mantenimiento', tono: 'alerta' },
  FUERA_DE_SERVICIO: { texto: 'Fuera de servicio', tono: 'peligro' },
};

export const TIPOS_VEHICULO = {
  COMPACTADOR: 'Compactador',
  VOLQUETA: 'Volqueta',
  CAMION: 'Camión',
  CAMIONETA: 'Camioneta',
  MOTOCARRO: 'Motocarro',
  OTRO: 'Otro',
};

export const ESTADOS_CONDUCTOR = {
  ACTIVO: { texto: 'Activo', tono: 'ok' },
  VACACIONES: { texto: 'Vacaciones', tono: 'info' },
  INCAPACITADO: { texto: 'Incapacitado', tono: 'alerta' },
  INACTIVO: { texto: 'Inactivo', tono: 'neutro' },
};

export const TIPOS_DOCUMENTO = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  PPT: 'Permiso por protección temporal',
  PA: 'Pasaporte',
};

export const CATEGORIAS_LICENCIA = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];

export const TIPOS_SERVICIO = {
  ORDINARIO: 'Ordinario',
  RECICLABLE: 'Reciclable',
  ORGANICO: 'Orgánico',
  ESPECIAL: 'Especial',
  BARRIDO: 'Barrido',
};

export const ESTADOS_RUTA = {
  ACTIVA: { texto: 'Activa', tono: 'ok' },
  SUSPENDIDA: { texto: 'Suspendida', tono: 'peligro' },
};

export const ESTADOS_PROGRAMACION = {
  ACTIVA: { texto: 'Activa', tono: 'ok' },
  CANCELADA: { texto: 'Cancelada', tono: 'peligro' },
  INACTIVA: { texto: 'Inactiva', tono: 'neutro' },
};

export const ESTADOS_SERVICIO = {
  PROGRAMADO: { texto: 'Programado', tono: 'neutro' },
  EN_CURSO: { texto: 'En curso', tono: 'info' },
  COMPLETADO: { texto: 'Completado', tono: 'ok' },
  NO_REALIZADO: { texto: 'No realizado', tono: 'peligro' },
};

export const DIAS = [
  { valor: 1, corto: 'Lun', largo: 'Lunes' },
  { valor: 2, corto: 'Mar', largo: 'Martes' },
  { valor: 3, corto: 'Mié', largo: 'Miércoles' },
  { valor: 4, corto: 'Jue', largo: 'Jueves' },
  { valor: 5, corto: 'Vie', largo: 'Viernes' },
  { valor: 6, corto: 'Sáb', largo: 'Sábado' },
  { valor: 7, corto: 'Dom', largo: 'Domingo' },
];

export function diasTexto(dias = []) {
  if (dias.length === 7) return 'Todos los días';
  if (dias.length === 5 && [1, 2, 3, 4, 5].every((d) => dias.includes(d))) return 'Lunes a viernes';
  return DIAS.filter((d) => dias.includes(d.valor)).map((d) => d.corto).join(', ');
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 'AAAA-MM-DD' -> '20 nov 2026' */
export function fechaCorta(fecha) {
  if (!fecha) return '—';
  const [a, m, d] = fecha.slice(0, 10).split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
}

/** Fecha de hoy en Colombia 'AAAA-MM-DD'. */
export function hoy() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function fechaLarga(fecha) {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(a, m - 1, d)),
  );
}

export function distanciaTexto(metros) {
  if (metros === null || metros === undefined) return '—';
  return metros >= 1000 ? `${(metros / 1000).toFixed(1)} km` : `${metros} m`;
}

export function opciones(mapa) {
  return Object.entries(mapa).map(([valor, etiqueta]) => ({
    valor,
    texto: typeof etiqueta === 'string' ? etiqueta : etiqueta.texto,
  }));
}
