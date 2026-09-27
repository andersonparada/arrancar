import { hash } from '@node-rs/argon2';
import pg from 'pg';
import { configuracion } from '../../configuracion.js';
import { migrarModulos } from '../../modulos/core/base-datos/migrador.js';
import { definicionesModulos } from '../../modulos/indice.js';

export const CREDENCIALES_SOPORTE = { usuario: 'supergod', contrasena: 'contrasena-de-soporte' } as const;

const TABLAS_CON_DATOS = ['core.cuentas', 'core.usuarios', 'core.configuraciones', 'core.bitacora_superacceso'];

function urlPropietario(): string {
  if (!configuracion.DATABASE_URL_PROPIETARIO) throw new Error('Falta DATABASE_URL_PROPIETARIO para las pruebas.');
  return configuracion.DATABASE_URL_PROPIETARIO;
}

async function comoPropietario(trabajo: (conexion: pg.Client) => Promise<void>): Promise<void> {
  const conexion = new pg.Client({ connectionString: urlPropietario() });
  await conexion.connect();
  try {
    await trabajo(conexion);
  } finally {
    await conexion.end();
  }
}

async function crearUsuarioDeSoporte(conexion: pg.Client): Promise<void> {
  await conexion.query(
    `insert into core.usuarios (usuario, nombres, apellidos, hash_contrasena, es_superacceso)
     values ($1, 'Soporte', 'Arrancar', $2, true)`,
    [CREDENCIALES_SOPORTE.usuario, await hash(CREDENCIALES_SOPORTE.contrasena)],
  );
}

/**
 * Deja la base de pruebas con todas las migraciones aplicadas, sin datos de
 * pruebas anteriores y con el usuario de soporte listo para iniciar sesión.
 */
export async function prepararBaseDeDatos(): Promise<void> {
  await migrarModulos(urlPropietario(), definicionesModulos);
  await comoPropietario(async (conexion) => {
    await conexion.query(`truncate ${TABLAS_CON_DATOS.join(', ')} cascade`);
    await crearUsuarioDeSoporte(conexion);
  });
}
