/**
 * Borra las bases de pruebas en paralelo de un prefijo: la plantilla y las de cada worker.
 * Uso: BD_PRUEBAS=<prefijo> npm run bd:limpiar-pruebas -w servidor   (por omisión `arrancar_pruebas`)
 * Solo toca `<prefijo>_plantilla` y `<prefijo>_<número>`; nunca la base `<prefijo>` ni las de otros prefijos.
 * El prefijo se valida (`validarPrefijoDeBases`) y los nombres se comparan en JavaScript.
 */
import pg from 'pg';
import {
  PREFIJO_BD_PRUEBAS,
  esBaseDePruebasDelPrefijo,
  urlDelPropietario,
} from '../src/pruebas-api/paralelo/nombres-de-bases.js';

const conexion = new pg.Client({ connectionString: urlDelPropietario('postgres') });
await conexion.connect();
const { rows } = await conexion.query<{ datname: string }>('select datname from pg_database');
for (const { datname } of rows.filter((fila) => esBaseDePruebasDelPrefijo(fila.datname, PREFIJO_BD_PRUEBAS))) {
  await conexion.query(`drop database ${pg.escapeIdentifier(datname)} with (force)`);
  console.log(`Borrada ${datname}`);
}
await conexion.end();
