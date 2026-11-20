#!/usr/bin/env node
/**
 * Crea el administrador inicial o restablece su contraseña.
 *
 *   npm run create-admin
 *   npm run create-admin -- --email jefe@turatrash.co --password "ClaveSegura123*" --nombre "Jefe de operaciones"
 *
 * Sin argumentos usa ADMIN_NOMBRE, ADMIN_EMAIL y ADMIN_PASSWORD del .env.
 * Si el correo ya existe, actualiza la contraseña y lo deja como ADMIN activo.
 */
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const { db } = require('../src/db');
const { esContrasenaSegura, REGLA_CONTRASENA } = require('../src/validators/comunes');

function leerArgumentos(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const clave = argv[i];
    if (clave.startsWith('--')) {
      args[clave.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = leerArgumentos(process.argv.slice(2));
  const nombre = (args.nombre || config.admin.nombre).trim();
  const email = (args.email || config.admin.email).trim().toLowerCase();
  const password = args.password || config.admin.password;

  if (!email.includes('@')) throw new Error('El correo no es válido.');
  if (!esContrasenaSegura(password)) throw new Error(`La contraseña no es segura: ${REGLA_CONTRASENA}`);

  const passwordHash = await bcrypt.hash(password, 10);
  const existente = await db('usuarios').where({ email }).first();

  if (existente) {
    await db('usuarios')
      .where({ id: existente.id })
      .update({ nombre, password_hash: passwordHash, rol: 'ADMIN', activo: true });
    // Cierra las sesiones abiertas: la contraseña cambió.
    await db('sesiones').where({ usuario_id: existente.id }).whereNull('cerrada_en').update({ cerrada_en: db.fn.now() });
    console.log(`Administrador actualizado: ${email}`);
  } else {
    await db('usuarios').insert({ nombre, email, password_hash: passwordHash, rol: 'ADMIN', activo: true });
    console.log(`Administrador creado: ${email}`);
  }
}

main()
  .catch((error) => {
    console.error(`No se pudo crear el administrador: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
