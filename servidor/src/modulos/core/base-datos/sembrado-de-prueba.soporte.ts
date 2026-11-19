import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { configuracion } from '../../../configuracion.js';

/**
 * Conexión del dueño de la base para armar los datos de las pruebas (cuentas, empresas, accesos). Con RLS de escritura
 * por cuenta (`diseno-rls-de-core.md` R-3), `arrancar_app` solo escribe esas tablas dentro de una unidad de trabajo de
 * la cuenta; los andamios que siembran varias cuentas a la vez lo hacen aquí. Las pruebas de la aplicación en sí siguen
 * usando `bd`.
 */
const grupoDelPropietario = new pg.Pool({
  connectionString: configuracion.DATABASE_URL_PROPIETARIO,
  max: 2,
  idleTimeoutMillis: 1000,
  allowExitOnIdle: true,
});

export const bdPropietario = drizzle(grupoDelPropietario, { casing: 'snake_case' });
