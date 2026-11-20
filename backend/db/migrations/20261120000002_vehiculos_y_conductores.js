/**
 * Entrega 2 · Vehículos y conductores
 * - vehiculos: placa única, estado operativo y bandera activo (desactivar).
 * - conductores: documento y licencia únicos, categoría y vencimiento de la
 *   licencia, y estado del conductor (INACTIVO = desactivado).
 */
exports.up = async function up(knex) {
  await knex.raw(`
    CREATE TABLE vehiculos (
      id                serial PRIMARY KEY,
      placa             varchar(10)  NOT NULL CHECK (placa ~ '^[A-Z0-9]{5,7}$'),
      tipo              varchar(30)  NOT NULL DEFAULT 'COMPACTADOR'
                        CHECK (tipo IN ('COMPACTADOR', 'VOLQUETA', 'CAMION', 'CAMIONETA', 'MOTOCARRO', 'OTRO')),
      marca             varchar(60)  NOT NULL CHECK (length(trim(marca)) >= 2),
      modelo            varchar(60)  NOT NULL CHECK (length(trim(modelo)) >= 1),
      anio              smallint     CHECK (anio BETWEEN 1980 AND 2100),
      capacidad_kg      integer      CHECK (capacidad_kg > 0),
      estado_operativo  varchar(20)  NOT NULL DEFAULT 'DISPONIBLE'
                        CHECK (estado_operativo IN ('DISPONIBLE', 'EN_SERVICIO', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO')),
      activo            boolean      NOT NULL DEFAULT true,
      observaciones     text,
      creado_en         timestamptz  NOT NULL DEFAULT now(),
      actualizado_en    timestamptz  NOT NULL DEFAULT now(),
      CONSTRAINT uq_vehiculos_placa UNIQUE (placa)
    );

    CREATE INDEX ix_vehiculos_estado ON vehiculos (activo, estado_operativo);

    CREATE TRIGGER trg_vehiculos_actualizado
      BEFORE UPDATE ON vehiculos
      FOR EACH ROW EXECUTE FUNCTION fn_actualizar_fecha_modificacion();

    COMMENT ON COLUMN vehiculos.placa IS 'En mayúsculas y sin espacios ni guiones (ej. ABC123)';
    COMMENT ON COLUMN vehiculos.activo IS 'false = vehículo desactivado (no se borra para conservar el historial)';
  `);

  await knex.raw(`
    CREATE TABLE conductores (
      id                    serial PRIMARY KEY,
      nombres               varchar(80)  NOT NULL CHECK (length(trim(nombres)) >= 2),
      apellidos             varchar(80)  NOT NULL CHECK (length(trim(apellidos)) >= 2),
      tipo_documento        varchar(3)   NOT NULL DEFAULT 'CC' CHECK (tipo_documento IN ('CC', 'CE', 'PPT', 'PA')),
      numero_documento      varchar(20)  NOT NULL CHECK (numero_documento ~ '^[A-Z0-9]{5,20}$'),
      telefono              varchar(20),
      email                 varchar(160) CHECK (email IS NULL OR email = lower(email)),
      licencia_numero       varchar(20)  NOT NULL CHECK (licencia_numero ~ '^[A-Z0-9]{5,20}$'),
      licencia_categoria    varchar(2)   NOT NULL
                            CHECK (licencia_categoria IN ('A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3')),
      licencia_vencimiento  date         NOT NULL,
      estado                varchar(20)  NOT NULL DEFAULT 'ACTIVO'
                            CHECK (estado IN ('ACTIVO', 'VACACIONES', 'INCAPACITADO', 'INACTIVO')),
      creado_en             timestamptz  NOT NULL DEFAULT now(),
      actualizado_en        timestamptz  NOT NULL DEFAULT now(),
      CONSTRAINT uq_conductores_documento UNIQUE (numero_documento),
      CONSTRAINT uq_conductores_licencia UNIQUE (licencia_numero)
    );

    CREATE INDEX ix_conductores_estado ON conductores (estado);

    CREATE TRIGGER trg_conductores_actualizado
      BEFORE UPDATE ON conductores
      FOR EACH ROW EXECUTE FUNCTION fn_actualizar_fecha_modificacion();

    COMMENT ON COLUMN conductores.estado IS 'ACTIVO puede programarse; INACTIVO = conductor desactivado';
  `);
};

exports.down = async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS conductores');
  await knex.raw('DROP TABLE IF EXISTS vehiculos');
};
