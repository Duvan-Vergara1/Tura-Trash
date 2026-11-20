const { z, texto, textoOpcional, enteroOpcional, booleanoQuery, normalizarCodigo } = require('./comunes');

const ESTADOS_VEHICULO = ['DISPONIBLE', 'EN_SERVICIO', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO'];
const TIPOS_VEHICULO = ['COMPACTADOR', 'VOLQUETA', 'CAMION', 'CAMIONETA', 'MOTOCARRO', 'OTRO'];
const anioMaximo = new Date().getFullYear() + 1;

const placa = z.preprocess(
  normalizarCodigo,
  z
    .string({ required_error: 'La placa es obligatoria.' })
    .regex(/^[A-Z]{3}\d{2}[A-Z0-9]$/, 'La placa debe tener el formato ABC123 (o ABC12D para motos).'),
);

const esquemaVehiculo = z
  .object({
    placa,
    tipo: z.enum(TIPOS_VEHICULO, { required_error: 'El tipo es obligatorio.' }),
    marca: texto('La marca', 2, 60),
    modelo: texto('El modelo', 1, 60),
    anio: enteroOpcional(`El año debe ser un número entre 1980 y ${anioMaximo}.`, 1980, anioMaximo),
    capacidad_kg: enteroOpcional('La capacidad debe ser un número entero entre 1 y 60000 kg.', 1, 60000),
    estado_operativo: z.enum(ESTADOS_VEHICULO, { required_error: 'El estado operativo es obligatorio.' }),
    observaciones: textoOpcional('Las observaciones', 500),
  })
  .strict();

const esquemaEstado = z.object({ estado_operativo: z.enum(ESTADOS_VEHICULO) }).strict();

const filtrosVehiculos = z.object({
  q: z.string().trim().optional(),
  estado_operativo: z.enum(ESTADOS_VEHICULO).optional(),
  activo: booleanoQuery,
});

module.exports = { ESTADOS_VEHICULO, TIPOS_VEHICULO, esquemaVehiculo, esquemaEstado, filtrosVehiculos };
