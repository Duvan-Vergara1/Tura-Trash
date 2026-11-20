/**
 * Entrega 4 · Programación del servicio
 * - turnos: franjas horarias con hora de inicio y fin (dentro del mismo día).
 * - programaciones: ruta + vehículo + conductor + turno, desde una fecha y en
 *   ciertos días de la semana (1 = lunes ... 7 = domingo, ISO 8601).
 *   Estados: ACTIVA, CANCELADA (con motivo) e INACTIVA (desactivada).
 * - servicios: estado real de una programación en una fecha concreta
 *   (PROGRAMADO, EN_CURSO, COMPLETADO, NO_REALIZADO). Si no hay fila para un
 *   día, el servicio de ese día se considera PROGRAMADO.
 *
 * Las reglas que dependen de otras tablas (vehículo disponible, conductor
 * activo, ruta activa con trazado, conflictos de horario) se validan en el
 * servicio de programación del backend, que responde con mensajes claros.
 */
exports.up = async function up(knex) {
  await knex.raw(`
    CREATE TABLE turnos (
      id              serial PRIMARY KEY,
      nombre          varchar(60) NOT NULL CHECK (length(trim(nombre)) >= 3),
      hora_inicio     time        NOT NULL,
      hora_fin        time        NOT NULL,
      activo          boolean     NOT NULL DEFAULT true,
      creado_en       timestamptz NOT NULL DEFAULT now(),
      actualizado_en  timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT ck_turnos_horario CHECK (hora_fin > hora_inicio)
    );

    CREATE UNIQUE INDEX uq_turnos_nombre ON turnos (lower(nombre));

    CREATE TRIGGER trg_turnos_actualizado
      BEFORE UPDATE ON turnos
      FOR EACH ROW EXECUTE FUNCTION fn_actualizar_fecha_modificacion();
  `);

  await knex.raw(`
    CREATE TABLE programaciones (
      id                  serial PRIMARY KEY,
      ruta_id             integer     NOT NULL REFERENCES rutas(id) ON DELETE RESTRICT,
      vehiculo_id         integer     NOT NULL REFERENCES vehiculos(id) ON DELETE RESTRICT,
      conductor_id        integer     NOT NULL REFERENCES conductores(id) ON DELETE RESTRICT,
      turno_id            integer     NOT NULL REFERENCES turnos(id) ON DELETE RESTRICT,
      fecha_inicio        date        NOT NULL,
      fecha_fin           date,
      dias_semana         smallint[]  NOT NULL,
      estado              varchar(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'CANCELADA', 'INACTIVA')),
      motivo_cancelacion  text,
      observaciones       text,
      creado_por          integer     REFERENCES usuarios(id) ON DELETE SET NULL,
      creado_en           timestamptz NOT NULL DEFAULT now(),
      actualizado_en      timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT ck_programaciones_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
      CONSTRAINT ck_programaciones_dias CHECK (
        cardinality(dias_semana) BETWEEN 1 AND 7
        AND dias_semana <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]
      ),
      CONSTRAINT ck_programaciones_cancelacion CHECK (
        estado <> 'CANCELADA' OR motivo_cancelacion IS NOT NULL
      )
    );

    CREATE INDEX ix_programaciones_ruta ON programaciones (ruta_id);
    CREATE INDEX ix_programaciones_vehiculo ON programaciones (vehiculo_id);
    CREATE INDEX ix_programaciones_conductor ON programaciones (conductor_id);
    CREATE INDEX ix_programaciones_estado_fechas ON programaciones (estado, fecha_inicio, fecha_fin);

    CREATE TRIGGER trg_programaciones_actualizado
      BEFORE UPDATE ON programaciones
      FOR EACH ROW EXECUTE FUNCTION fn_actualizar_fecha_modificacion();

    COMMENT ON COLUMN programaciones.dias_semana IS 'Días ISO: 1 lunes, 2 martes, ... 7 domingo';
    COMMENT ON COLUMN programaciones.fecha_fin IS 'NULL = la programación no tiene fecha de finalización';
  `);

  await knex.raw(`
    CREATE TABLE servicios (
      id               serial PRIMARY KEY,
      programacion_id  integer     NOT NULL REFERENCES programaciones(id) ON DELETE CASCADE,
      fecha            date        NOT NULL,
      estado           varchar(20) NOT NULL DEFAULT 'PROGRAMADO'
                       CHECK (estado IN ('PROGRAMADO', 'EN_CURSO', 'COMPLETADO', 'NO_REALIZADO')),
      observaciones    text,
      actualizado_por  integer     REFERENCES usuarios(id) ON DELETE SET NULL,
      creado_en        timestamptz NOT NULL DEFAULT now(),
      actualizado_en   timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_servicios_programacion_fecha UNIQUE (programacion_id, fecha)
    );

    CREATE INDEX ix_servicios_fecha ON servicios (fecha);

    CREATE TRIGGER trg_servicios_actualizado
      BEFORE UPDATE ON servicios
      FOR EACH ROW EXECUTE FUNCTION fn_actualizar_fecha_modificacion();
  `);
};

exports.down = async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS servicios');
  await knex.raw('DROP TABLE IF EXISTS programaciones');
  await knex.raw('DROP TABLE IF EXISTS turnos');
};
