/**
 * Entrega 1 · Acceso administrativo
 * - Función común para mantener actualizado_en.
 * - usuarios: cuentas del sistema con rol y estado.
 * - sesiones: cada inicio de sesión. El JWT lleva el id de la sesión, así el
 *   cierre de sesión invalida el token aunque no haya expirado.
 */
exports.up = async function up(knex) {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION fn_actualizar_fecha_modificacion()
    RETURNS trigger AS $$
    BEGIN
      NEW.actualizado_en = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TABLE usuarios (
      id              serial PRIMARY KEY,
      nombre          varchar(120) NOT NULL CHECK (length(trim(nombre)) >= 3),
      email           varchar(160) NOT NULL CHECK (email = lower(email) AND position('@' in email) > 1),
      password_hash   varchar(100) NOT NULL,
      rol             varchar(20)  NOT NULL DEFAULT 'OPERADOR' CHECK (rol IN ('ADMIN', 'OPERADOR')),
      activo          boolean      NOT NULL DEFAULT true,
      ultimo_acceso   timestamptz,
      creado_en       timestamptz  NOT NULL DEFAULT now(),
      actualizado_en  timestamptz  NOT NULL DEFAULT now(),
      CONSTRAINT uq_usuarios_email UNIQUE (email)
    );

    CREATE TRIGGER trg_usuarios_actualizado
      BEFORE UPDATE ON usuarios
      FOR EACH ROW EXECUTE FUNCTION fn_actualizar_fecha_modificacion();

    COMMENT ON TABLE usuarios IS 'Cuentas que pueden ingresar al sistema';
    COMMENT ON COLUMN usuarios.email IS 'Siempre en minúsculas; es el usuario de ingreso';
    COMMENT ON COLUMN usuarios.password_hash IS 'Hash bcrypt, nunca la contraseña en texto plano';
  `);

  await knex.raw(`
    CREATE TABLE sesiones (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id  integer      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      creada_en   timestamptz  NOT NULL DEFAULT now(),
      expira_en   timestamptz  NOT NULL,
      cerrada_en  timestamptz,
      ip          varchar(64),
      agente      varchar(255),
      CONSTRAINT ck_sesiones_expiracion CHECK (expira_en > creada_en)
    );

    CREATE INDEX ix_sesiones_usuario ON sesiones (usuario_id);

    COMMENT ON TABLE sesiones IS 'Sesiones emitidas; cerrada_en con valor significa que el token ya no sirve';
  `);
};

exports.down = async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS sesiones');
  await knex.raw('DROP TABLE IF EXISTS usuarios');
  await knex.raw('DROP FUNCTION IF EXISTS fn_actualizar_fecha_modificacion()');
};
