const { z, texto, textoOpcional, fecha, hora, idEntero, booleanoQuery, esFechaValida } = require('./comunes');

const ESTADOS_PROGRAMACION = ['ACTIVA', 'CANCELADA', 'INACTIVA'];
const ESTADOS_SERVICIO = ['PROGRAMADO', 'EN_CURSO', 'COMPLETADO', 'NO_REALIZADO'];

// ----------------------------------------------------------------- Turnos --
const esquemaTurno = z
  .object({
    nombre: texto('El nombre', 3, 60),
    hora_inicio: hora('La hora de inicio'),
    hora_fin: hora('La hora de finalización'),
  })
  .strict()
  .refine((t) => t.hora_fin > t.hora_inicio, {
    path: ['hora_fin'],
    message: 'La hora de finalización debe ser posterior a la de inicio (el turno no puede pasar de medianoche).',
  });

const filtrosTurnos = z.object({ activo: booleanoQuery });

// --------------------------------------------------------- Programaciones --
const diasSemana = z
  .array(z.coerce.number().int().min(1, 'Día no válido.').max(7, 'Día no válido.'), {
    required_error: 'Selecciona al menos un día de la semana.',
  })
  .min(1, 'Selecciona al menos un día de la semana.')
  .transform((dias) => [...new Set(dias)].sort((a, b) => a - b));

const fechaFinOpcional = z
  .union([z.literal(''), z.null(), z.undefined(), z.string()])
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || esFechaValida(v), 'La fecha de finalización debe ser una fecha válida (AAAA-MM-DD).');

const esquemaProgramacion = z
  .object({
    ruta_id: idEntero('La ruta'),
    vehiculo_id: idEntero('El vehículo'),
    conductor_id: idEntero('El conductor'),
    turno_id: idEntero('El turno'),
    fecha_inicio: fecha('La fecha de inicio'),
    fecha_fin: fechaFinOpcional,
    dias_semana: diasSemana,
    observaciones: textoOpcional('Las observaciones', 500),
  })
  .strict()
  .refine((p) => p.fecha_fin === null || p.fecha_fin >= p.fecha_inicio, {
    path: ['fecha_fin'],
    message: 'La fecha de finalización no puede ser anterior a la de inicio.',
  });

const esquemaCancelacion = z.object({ motivo: texto('El motivo de la cancelación', 3, 500) }).strict();

const filtrosProgramaciones = z.object({
  estado: z.enum(ESTADOS_PROGRAMACION).optional(),
  ruta_id: idEntero('La ruta').optional(),
  vehiculo_id: idEntero('El vehículo').optional(),
  conductor_id: idEntero('El conductor').optional(),
  turno_id: idEntero('El turno').optional(),
  fecha: fecha('La fecha').optional(),
});

// -------------------------------------------------------------- Servicios --
const filtrosServicios = z.object({
  fecha: fecha('La fecha').optional(),
  ruta_id: idEntero('La ruta').optional(),
  vehiculo_id: idEntero('El vehículo').optional(),
  conductor_id: idEntero('El conductor').optional(),
  estado: z.enum(ESTADOS_SERVICIO).optional(),
});

const parametrosServicio = z.object({
  programacionId: idEntero('La programación'),
  fecha: fecha('La fecha'),
});

const esquemaEstadoServicio = z
  .object({
    estado: z.enum(ESTADOS_SERVICIO, { required_error: 'El estado es obligatorio.' }),
    observaciones: textoOpcional('Las observaciones', 500),
  })
  .strict();

module.exports = {
  ESTADOS_PROGRAMACION,
  ESTADOS_SERVICIO,
  esquemaTurno,
  filtrosTurnos,
  esquemaProgramacion,
  esquemaCancelacion,
  filtrosProgramaciones,
  filtrosServicios,
  parametrosServicio,
  esquemaEstadoServicio,
};
