const { z, texto, textoOpcional, fecha, normalizarCodigo } = require('./comunes');

const ESTADOS_CONDUCTOR = ['ACTIVO', 'VACACIONES', 'INCAPACITADO', 'INACTIVO'];
const TIPOS_DOCUMENTO = ['CC', 'CE', 'PPT', 'PA'];
const CATEGORIAS_LICENCIA = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];

const codigo = (campo) =>
  z.preprocess(
    normalizarCodigo,
    z
      .string({ required_error: `${campo} es obligatorio.` })
      .regex(/^[A-Z0-9]{5,20}$/, `${campo} debe tener entre 5 y 20 letras o números.`),
  );

const esquemaConductor = z
  .object({
    nombres: texto('Los nombres', 2, 80),
    apellidos: texto('Los apellidos', 2, 80),
    tipo_documento: z.enum(TIPOS_DOCUMENTO, { required_error: 'El tipo de documento es obligatorio.' }),
    numero_documento: codigo('El número de documento'),
    telefono: textoOpcional('El teléfono', 20).refine(
      (v) => v === null || /^[0-9+\s-]{7,20}$/.test(v),
      'El teléfono solo puede tener números, espacios, + o guiones (7 a 20 caracteres).',
    ),
    email: textoOpcional('El correo', 160)
      .transform((v) => (v ? v.toLowerCase() : v))
      .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'El correo no es válido.'),
    licencia_numero: codigo('El número de licencia'),
    licencia_categoria: z.enum(CATEGORIAS_LICENCIA, { required_error: 'La categoría de la licencia es obligatoria.' }),
    licencia_vencimiento: fecha('La fecha de vencimiento de la licencia'),
    estado: z.enum(ESTADOS_CONDUCTOR, { required_error: 'El estado es obligatorio.' }),
  })
  .strict()
  .refine((d) => d.tipo_documento !== 'CC' || /^\d{6,10}$/.test(d.numero_documento), {
    path: ['numero_documento'],
    message: 'La cédula de ciudadanía debe tener entre 6 y 10 dígitos.',
  });

const esquemaEstado = z.object({ estado: z.enum(ESTADOS_CONDUCTOR) }).strict();

const filtrosConductores = z.object({
  q: z.string().trim().optional(),
  estado: z.enum(ESTADOS_CONDUCTOR).optional(),
});

module.exports = {
  ESTADOS_CONDUCTOR,
  TIPOS_DOCUMENTO,
  CATEGORIAS_LICENCIA,
  esquemaConductor,
  esquemaEstado,
  filtrosConductores,
};
