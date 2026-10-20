import pg from 'pg';
import { configuracion } from '../../configuracion.js';

/** Las columnas de una tabla del libro, para copiar filas con SQL sin listarlas a mano. */
async function columnasDe(conexion: pg.Client, tabla: string): Promise<string[]> {
  const { rows } = await conexion.query<{ column_name: string }>(
    `select column_name from information_schema.columns
     where table_schema = 'libro_de_compras' and table_name = $1 and is_generated = 'NEVER' order by ordinal_position`,
    [tabla],
  );
  return rows.map((fila) => fila.column_name);
}

const reemplazos = (reemplazo: Record<string, string>) => (columna: string) => reemplazo[columna] ?? `o.${columna}`;

/**
 * Copia `cantidad` veces un documento con sus líneas, directo en la base (como propietario), para armar un libro
 * enorme sin pasar 5,000 veces por la API. Cada copia lleva otro número y otra autorización FEL.
 */
export async function clonarDocumento(documentoId: string, cantidad: number): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    await conexion.query('begin');
    await conexion.query(
      'create temp table clon on commit drop as select g, gen_random_uuid() as id from generate_series(1, $1::int) g',
      [cantidad],
    );
    const documentos = await columnasDe(conexion, 'documentos');
    const lineas = await columnasDe(conexion, 'lineas_de_documento');
    const deDocumento = reemplazos({ id: 'c.id', numero: "'T' || c.g", autorizacion_fel: 'gen_random_uuid()' });
    await conexion.query(
      `insert into libro_de_compras.documentos (${documentos.join(', ')})
       select ${documentos.map(deDocumento).join(', ')} from libro_de_compras.documentos o cross join clon c where o.id = $1`,
      [documentoId],
    );
    const deLinea = reemplazos({ id: 'gen_random_uuid()', documento_id: 'c.id' });
    await conexion.query(
      `insert into libro_de_compras.lineas_de_documento (${lineas.join(', ')})
       select ${lineas.map(deLinea).join(', ')} from libro_de_compras.lineas_de_documento o cross join clon c where o.documento_id = $1`,
      [documentoId],
    );
    await conexion.query('commit');
  } finally {
    await conexion.end();
  }
}
