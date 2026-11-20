// Piezas de validación reutilizables (Zod) con mensajes en español.
const { z } = require('zod');

// Mensajes en español para los errores genéricos de Zod.
z.setErrorMap((issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.received === 'undefined' || issue.received === 'null') return { message: 'Este campo es obligatorio.' };
    return { message: 'El valor no tiene el formato esperado.' };
  }
  if (issue.code === z.ZodIssueCode.invalid_enum_value) {
    return { message: `Valor no permitido. Opciones: ${issue.options.join(', ')}.` };
  }
  if (issue.code === z.ZodIssueCode.unrecognized_keys) {
    return { message: `Campos no permitidos: ${issue.keys.join(', ')}.` };
  }
  return { message: ctx.defaultError };
});

const REGLA_CONTRASENA = 'mínimo 8 caracteres, con al menos una letra y un número';

function esContrasenaSegura(valor) {
  return typeof valor === 'string' && valor.length >= 8 && /[A-Za-z]/.test(valor) && /\d/.test(valor);
}

/** Texto obligatorio, sin espacios sobrantes. */
const texto = (campo, min, max) =>
  z
    .string({ required_error: `${campo} es obligatorio.` })
    .trim()
    .min(min, `${campo} debe tener al menos ${min} caracteres.`)
    .max(max, `${campo} no puede superar ${max} caracteres.`);

/** Texto opcional: '' y null se guardan como null. */
const textoOpcional = (campo, max) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null))
    .refine((v) => v === null || v.length <= max, `${campo} no puede superar ${max} caracteres.`);

/** Entero opcional: '' y null se guardan como null; valida rango. */
const enteroOpcional = (mensaje, min, max) =>
  z
    .union([z.literal(''), z.null(), z.undefined(), z.coerce.number({ invalid_type_error: mensaje })])
    .transform((v) => (v === '' || v === undefined ? null : v))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), mensaje);

function esFechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [a, m, d] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d;
}

const fecha = (campo) =>
  z
    .string({ required_error: `${campo} es obligatoria.` })
    .refine(esFechaValida, `${campo} debe ser una fecha válida (AAAA-MM-DD).`);

const hora = (campo) =>
  z
    .string({ required_error: `${campo} es obligatoria.` })
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, `${campo} debe tener el formato HH:MM (24 horas).`)
    .transform((v) => v.slice(0, 5));

const idEntero = (campo) =>
  z.coerce
    .number({ invalid_type_error: `${campo} no es válido.`, required_error: `${campo} es obligatorio.` })
    .int(`${campo} no es válido.`)
    .positive(`${campo} no es válido.`);

const parametroId = z.object({ id: idEntero('El identificador') });

/** Para filtros en la URL: "true"/"false" -> boolean. */
const booleanoQuery = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

/** Identificadores: mayúsculas y sin espacios, puntos ni guiones. */
const normalizarCodigo = (v) => (typeof v === 'string' ? v.toUpperCase().replace(/[\s.\-]/g, '') : v);

module.exports = {
  z,
  REGLA_CONTRASENA,
  esContrasenaSegura,
  esFechaValida,
  texto,
  textoOpcional,
  enteroOpcional,
  fecha,
  hora,
  idEntero,
  parametroId,
  booleanoQuery,
  normalizarCodigo,
};
