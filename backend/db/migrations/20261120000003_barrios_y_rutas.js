/**
 * Entrega 3 · Barrios, rutas y mapa
 * - barrios: barrios o sectores de Buenaventura (comuna 1 a 12 o zona rural).
 * - rutas: nombre, descripción, tipo de servicio y estado (ACTIVA/SUSPENDIDA).
 * - ruta_barrios: barrios que atiende cada ruta.
 * - ruta_puntos: trazado ordenado del recorrido (inicio -> fin). Una ruta con
 *   menos de 2 puntos se considera "sin trazado".
 */
exports.up = async function up(knex) {
  await knex.raw(`
    CREATE TABLE barrios (
      id              serial PRIMARY KEY,
      nombre          varchar(100) NOT NULL CHECK (length(trim(nombre)) >= 2),
      comuna          smallint     CHECK (comuna BETWEEN 1 AND 12),
      zona            varchar(10)  NOT NULL DEFAULT 'URBANA' CHECK (zona IN ('URBANA', 'RURAL')),
      descripcion     text,
      activo          boolean      NOT NULL DEFAULT true,
      creado_en       timestamptz  NOT NULL DEFAULT now(),
      actualizado_en  timestamptz  NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX uq_barrios_nombre ON barrios (lower(nombre));

    CREATE TRIGGER trg_barrios_actualizado
      BEFORE UPDATE ON barrios
      FOR EACH ROW EXECUTE FUNCTION fn_actualizar_fecha_modificacion();
  `);

  await knex.raw(`
    CREATE TABLE rutas (
      id                 serial PRIMARY KEY,
      nombre             varchar(120) NOT NULL CHECK (length(trim(nombre)) >= 3),
      descripcion        text         NOT NULL CHECK (length(trim(descripcion)) >= 5),
      tipo_servicio      varchar(20)  NOT NULL
                         CHECK (tipo_servicio IN ('ORDINARIO', 'RECICLABLE', 'ORGANICO', 'ESPECIAL', 'BARRIDO')),
      estado             varchar(20)  NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'SUSPENDIDA')),
      motivo_suspension  text,
      distancia_m        integer      CHECK (distancia_m >= 0),
      creado_en          timestamptz  NOT NULL DEFAULT now(),
      actualizado_en     timestamptz  NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX uq_rutas_nombre ON rutas (lower(nombre));
    CREATE INDEX ix_rutas_estado ON rutas (estado);

    CREATE TRIGGER trg_rutas_actualizado
      BEFORE UPDATE ON rutas
      FOR EACH ROW EXECUTE FUNCTION fn_actualizar_fecha_modificacion();

    COMMENT ON COLUMN rutas.distancia_m IS 'Longitud del trazado en metros, calculada al guardar el recorrido';
  `);

  await knex.raw(`
    CREATE TABLE ruta_barrios (
      ruta_id    integer NOT NULL REFERENCES rutas(id) ON DELETE CASCADE,
      barrio_id  integer NOT NULL REFERENCES barrios(id) ON DELETE RESTRICT,
      PRIMARY KEY (ruta_id, barrio_id)
    );

    CREATE INDEX ix_ruta_barrios_barrio ON ruta_barrios (barrio_id);
  `);

  await knex.raw(`
    CREATE TABLE ruta_puntos (
      id        serial PRIMARY KEY,
      ruta_id   integer       NOT NULL REFERENCES rutas(id) ON DELETE CASCADE,
      orden     integer       NOT NULL CHECK (orden >= 1),
      latitud   numeric(9, 6) NOT NULL CHECK (latitud BETWEEN -90 AND 90),
      longitud  numeric(9, 6) NOT NULL CHECK (longitud BETWEEN -180 AND 180),
      CONSTRAINT uq_ruta_puntos_orden UNIQUE (ruta_id, orden)
    );

    COMMENT ON TABLE ruta_puntos IS 'Puntos del recorrido en orden: el 1 es el inicio y el mayor es el final';
  `);
};

exports.down = async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS ruta_puntos');
  await knex.raw('DROP TABLE IF EXISTS ruta_barrios');
  await knex.raw('DROP TABLE IF EXISTS rutas');
  await knex.raw('DROP TABLE IF EXISTS barrios');
};
