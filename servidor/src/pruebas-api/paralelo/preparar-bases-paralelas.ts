import pg from 'pg';
import { BD_PLANTILLA, bdDelWorker, trabajadoresDePruebas, urlDelPropietario } from './nombres-de-bases.js';

const identificador = pg.escapeIdentifier;

async function comoAdministrador<T>(trabajo: (conexion: pg.Client) => Promise<T>): Promise<T> {
  const conexion = new pg.Client({ connectionString: urlDelPropietario('postgres') });
  await conexion.connect();
  try {
    return await trabajo(conexion);
  } finally {
    await conexion.end();
  }
}

async function existeLaBase(conexion: pg.Client, base: string): Promise<boolean> {
  const resultado = await conexion.query('select 1 from pg_database where datname = $1', [base]);
  return resultado.rowCount === 1;
}

async function crearBase(conexion: pg.Client, base: string, plantilla?: string): Promise<void> {
  const clon = plantilla ? ` template ${identificador(plantilla)}` : '';
  await conexion.query(`create database ${identificador(base)} owner arrancar${clon}`);
  await conexion.query(`grant connect on database ${identificador(base)} to arrancar_app`);
}

/** Migra la plantilla (solo lo pendiente) con el código real del migrador. */
async function migrarPlantilla(): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.URL_PUBLICA ??= 'http://localhost:5180';
  process.env.DATABASE_URL = urlDelPropietario(BD_PLANTILLA);
  const { migrarModulos } = await import('../../modulos/core/base-datos/migrador.js');
  const { definicionesModulos } = await import('../../modulos/indice.js');
  await migrarModulos(urlDelPropietario(BD_PLANTILLA), definicionesModulos);
}

/**
 * Una vez por corrida: crea las bases de los workers que falten, clonándolas de una plantilla
 * migrada, para que los archivos de pruebas que corren a la vez no se pisen los datos.
 * Las bases se conservan entre corridas (borrarlas fuerza un checkpoint lento de PostgreSQL);
 * cada archivo de pruebas las migra y limpia al empezar (`prepararBaseDeDatos`).
 */
export async function setup(): Promise<void> {
  const workers = Array.from({ length: trabajadoresDePruebas() }, (_, i) => bdDelWorker(i + 1));
  const faltantes = await comoAdministrador(async (conexion) => {
    const sinCrear: string[] = [];
    for (const base of workers) if (!(await existeLaBase(conexion, base))) sinCrear.push(base);
    if (sinCrear.length > 0 && !(await existeLaBase(conexion, BD_PLANTILLA))) await crearBase(conexion, BD_PLANTILLA);
    return sinCrear;
  });
  if (faltantes.length === 0) return;
  await migrarPlantilla();
  await comoAdministrador(async (conexion) => {
    for (const base of faltantes) await crearBase(conexion, base, BD_PLANTILLA);
  });
}
