/**
 * Borra las bases de pruebas en paralelo de un prefijo: la plantilla y las de cada worker.
 * Uso: BD_PRUEBAS=<prefijo> npm run bd:limpiar-pruebas -w servidor   (por omisión `arrancar_pruebas`)
 * Solo toca `<prefijo>_plantilla` y `<prefijo>_<número>`; nunca la base `<prefijo>` ni las de otros prefijos.
 */
import pg from 'pg';
import { BD_PLANTILLA, PREFIJO_BD_PRUEBAS, urlDelPropietario } from '../src/pruebas-api/paralelo/nombres-de-bases.js';

const conexion = new pg.Client({ connectionString: urlDelPropietario('postgres') });
await conexion.connect();
const patron = `^${PREFIJO_BD_PRUEBAS}_[0-9]+$`;
const { rows } = await conexion.query<{ datname: string }>(
  'select datname from pg_database where datname = $1 or datname ~ $2',
  [BD_PLANTILLA, patron],
);
for (const { datname } of rows) {
  await conexion.query(`drop database ${pg.escapeIdentifier(datname)} with (force)`);
  console.log(`Borrada ${datname}`);
}
await conexion.end();
