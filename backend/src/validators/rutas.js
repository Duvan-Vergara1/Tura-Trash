const { z, texto, textoOpcional, enteroOpcional, idEntero, booleanoQuery } = require('./comunes');

const TIPOS_SERVICIO = ['ORDINARIO', 'RECICLABLE', 'ORGANICO', 'ESPECIAL', 'BARRIDO'];
const ESTADOS_RUTA = ['ACTIVA', 'SUSPENDIDA'];
const ZONAS = ['URBANA', 'RURAL'];

// Recuadro aproximado del municipio de Buenaventura para rechazar puntos
// claramente equivocados (por ejemplo, latitud y longitud invertidas).
const LIMITES_BUENAVENTURA = { latMin: 3.0, latMax: 4.3, lngMin: -77.7, lngMax: -76.5 };

// ---------------------------------------------------------------- Barrios --
const esquemaBarrio = z
  .object({
    nombre: texto('El nombre', 2, 100),
    comuna: enteroOpcional('La comuna debe ser un número entre 1 y 12.', 1, 12),
    zona: z.enum(ZONAS).default('URBANA'),
    descripcion: textoOpcional('La descripción', 500),
  })
  .strict();

const filtrosBarrios = z.object({
  q: z.string().trim().optional(),
  activo: booleanoQuery,
});

// ------------------------------------------------------------------ Rutas --
const punto = z
  .object({
    latitud: z.coerce.number({ invalid_type_error: 'La latitud debe ser un número.' }),
    longitud: z.coerce.number({ invalid_type_error: 'La longitud debe ser un número.' }),
  })
  .strict()
  .refine(
    (p) =>
      p.latitud >= LIMITES_BUENAVENTURA.latMin &&
      p.latitud <= LIMITES_BUENAVENTURA.latMax &&
      p.longitud >= LIMITES_BUENAVENTURA.lngMin &&
      p.longitud <= LIMITES_BUENAVENTURA.lngMax,
    'El punto está fuera del municipio de Buenaventura.',
  )
  .transform((p) => ({ latitud: Number(p.latitud.toFixed(6)), longitud: Number(p.longitud.toFixed(6)) }));

const puntos = z
  .array(punto, { invalid_type_error: 'El trazado debe ser una lista de puntos.' })
  .max(500, 'El trazado no puede tener más de 500 puntos.')
  .refine((lista) => lista.length === 0 || lista.length >= 2, 'El trazado necesita al menos 2 puntos (inicio y fin).');

const barrioIds = z
  .array(idEntero('El barrio'))
  .max(100)
  .default([])
  .transform((ids) => [...new Set(ids)]);

const esquemaRuta = z
  .object({
    nombre: texto('El nombre', 3, 120),
    descripcion: texto('La descripción', 5, 1000),
    tipo_servicio: z.enum(TIPOS_SERVICIO, { required_error: 'El tipo de servicio es obligatorio.' }),
    estado: z.enum(ESTADOS_RUTA).default('ACTIVA'),
    motivo_suspension: textoOpcional('El motivo de suspensión', 500),
    barrio_ids: barrioIds,
    puntos: puntos.optional(),
  })
  .strict()
  .refine((r) => r.estado !== 'SUSPENDIDA' || r.motivo_suspension, {
    path: ['motivo_suspension'],
    message: 'Indica el motivo de la suspensión.',
  });

const esquemaTrazado = z.object({ puntos }).strict();

const esquemaSuspension = z
  .object({ motivo: texto('El motivo', 3, 500) })
  .strict();

const filtrosRutas = z.object({
  q: z.string().trim().optional(),
  estado: z.enum(ESTADOS_RUTA).optional(),
  tipo_servicio: z.enum(TIPOS_SERVICIO).optional(),
});

module.exports = {
  TIPOS_SERVICIO,
  ESTADOS_RUTA,
  ZONAS,
  LIMITES_BUENAVENTURA,
  esquemaBarrio,
  filtrosBarrios,
  esquemaRuta,
  esquemaTrazado,
  esquemaSuspension,
  filtrosRutas,
};
