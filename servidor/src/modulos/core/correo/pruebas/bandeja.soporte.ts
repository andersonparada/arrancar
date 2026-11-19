import pg from 'pg';
import { afterAll, beforeAll } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { grupoConexiones } from '../../base-datos/conexion.js';
import { migrarModulos } from '../../base-datos/migrador.js';
import { definicionesModulos } from '../../../indice.js';

/** Dos cuentas, tres empresas: lo mínimo para probar el aislamiento por empresa y por cuenta. */
export interface EscenarioDeBandeja {
  cuentaA: string;
  cuentaB: string;
  empresaA1: string;
  empresaA2: string;
  empresaB: string;
}

export interface ContextoDeApp {
  empresaId?: string;
  cuentaId?: string;
}

export interface CorreoDePrueba {
  cuentaId: string;
  empresaId: string;
  estado?: string;
  intentos?: number;
  proximoIntento?: string;
  bloqueadoHasta?: string | null;
  creadoEn?: string;
  adjuntoArchivoId?: string | null;
}

export interface DestinatarioDePrueba {
  correoId: string;
  cuentaId: string;
  empresaId: string;
  direccion: string;
  creadoEn?: string | undefined;
}

/** Una consulta con o sin parámetros. */
export type Consulta = string | [sql: string, parametros: unknown[]];

let contador = 0;

/** Un instante a `minutos` minutos de ahora (negativo: en el pasado), para las columnas con fecha. */
export const enMinutos = (minutos: number): string => new Date(Date.now() + minutos * 60_000).toISOString();

/** Conexiones y escenario de una prueba de la bandeja; se llenan en `beforeAll`. */
export interface BandejaDePrueba {
  propietario: pg.Client;
  aplicacion: pg.Client;
  escenario: EscenarioDeBandeja;
}

/** Abre las conexiones (propietario y `arrancar_app`), siembra el escenario y lo limpia al terminar. */
export function prepararBandeja(): BandejaDePrueba {
  const bandeja = {} as BandejaDePrueba;
  beforeAll(async () => {
    await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
    bandeja.propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    bandeja.aplicacion = new pg.Client({ connectionString: configuracion.DATABASE_URL });
    await bandeja.propietario.connect();
    await bandeja.aplicacion.connect();
    await bandeja.propietario.query('truncate core.cuentas, core.usuarios, core.servidor_de_correo cascade');
    bandeja.escenario = await sembrarEscenario(bandeja.propietario);
  });
  afterAll(async () => {
    await bandeja.propietario.query('truncate core.cuentas, core.usuarios, core.servidor_de_correo cascade');
    await bandeja.propietario.end();
    await bandeja.aplicacion.end();
    await grupoConexiones.end();
  });
  return bandeja;
}

async function sembrarEscenario(propietario: pg.Client): Promise<EscenarioDeBandeja> {
  const cuenta = async (nombre: string) =>
    (await propietario.query('insert into core.cuentas (nombre) values ($1) returning id', [nombre])).rows[0].id;
  const empresa = async (cuentaId: string, nombre: string) =>
    (
      await propietario.query('insert into core.empresas (cuenta_id, nombre) values ($1, $2) returning id', [
        cuentaId,
        nombre,
      ])
    ).rows[0].id;
  const [cuentaA, cuentaB] = [await cuenta('Cuenta A'), await cuenta('Cuenta B')];
  return {
    cuentaA,
    cuentaB,
    empresaA1: await empresa(cuentaA, 'Empresa A1'),
    empresaA2: await empresa(cuentaA, 'Empresa A2'),
    empresaB: await empresa(cuentaB, 'Empresa B'),
  };
}

/** Deja un único servidor de correo con la contraseña falsa (solo importa que exista y esté activo o no). */
export async function guardarServidor(propietario: pg.Client, activo: boolean): Promise<void> {
  await propietario.query('delete from core.servidor_de_correo');
  await propietario.query(
    `insert into core.servidor_de_correo (servidor, usuario, contrasena_cifrada, iv, version_de_clave,
                                          remitente_direccion, remitente_nombre, activo)
     values ('smtp.prueba.com', 'u', '\\x00', decode(repeat('00', 12), 'hex'), 1, 'n@prueba.com', 'Prueba', $1)`,
    [activo],
  );
}

function arriendoDe(datos: CorreoDePrueba): string | null {
  if (datos.bloqueadoHasta !== undefined) return datos.bloqueadoHasta;
  return datos.estado === 'enviando' ? enMinutos(5) : null;
}

/** Inserta un correo (como propietario, sin RLS) con un destinatario `para` y devuelve su id. */
export async function insertarCorreo(propietario: pg.Client, datos: CorreoDePrueba): Promise<string> {
  contador += 1;
  const estado = datos.estado ?? 'pendiente';
  const { rows } = await propietario.query(
    `insert into core.correos_salientes (cuenta_id, empresa_id, tipo, recurso_origen, registro_origen_id, asunto,
       cuerpo_texto, cuerpo_html, nombre_visible, message_id, estado, intentos, proximo_intento, bloqueado_hasta,
       enviado_en, cancelado_en, motivo_de_cancelacion, creado_en, adjunto_archivo_id, adjunto_nombre)
     values ($1, $2, 'prueba.aviso', 'prueba.registros', gen_random_uuid(), 'Asunto', 'texto', '<p>html</p>',
       'Empresa por medio de Arrancar', $3, $4, $5, coalesce($6::timestamptz, now()), $7,
       case when $4 = 'enviado' then now() end, case when $4 = 'cancelado' then now() end,
       case when $4 = 'cancelado' then 'Prueba' end, coalesce($8::timestamptz, now()), $9,
       case when $9::uuid is not null then 'comprobante.pdf' end)
     returning id`,
    [
      datos.cuentaId,
      datos.empresaId,
      `<${contador}-${Date.now()}@prueba.com>`,
      estado,
      datos.intentos ?? 0,
      datos.proximoIntento ?? null,
      arriendoDe({ ...datos, estado }),
      datos.creadoEn ?? null,
      datos.adjuntoArchivoId ?? null,
    ],
  );
  const { cuentaId, empresaId, creadoEn } = datos;
  const correoId = rows[0].id as string;
  const direccion = `destino${contador}@prueba.com`;
  await insertarDestinatario(propietario, { correoId, cuentaId, empresaId, creadoEn, direccion });
  return correoId;
}

export async function insertarDestinatario(propietario: pg.Client, datos: DestinatarioDePrueba): Promise<void> {
  await propietario.query(
    `insert into core.destinatarios_de_correos (correo_saliente_id, empresa_id, cuenta_id, clase, direccion, origen, creado_en)
     values ($1, $2, $3, 'para', $4, 'tercero', coalesce($5::timestamptz, now()))`,
    [datos.correoId, datos.empresaId, datos.cuentaId, datos.direccion, datos.creadoEn ?? null],
  );
}

/** Corre una consulta como `arrancar_app` dentro de una transacción con el contexto indicado, y siempre la deshace. */
export async function comoApp<T extends pg.QueryResultRow>(
  aplicacion: pg.Client,
  contexto: ContextoDeApp,
  consulta: Consulta,
): Promise<pg.QueryResult<T>> {
  const [sql, parametros] = typeof consulta === 'string' ? [consulta, []] : consulta;
  await aplicacion.query('begin');
  try {
    await aplicacion.query(`select set_config('app.empresa_id', $1, true), set_config('app.cuenta_id', $2, true)`, [
      contexto.empresaId ?? '',
      contexto.cuentaId ?? '',
    ]);
    return await aplicacion.query<T>(sql, parametros);
  } finally {
    await aplicacion.query('rollback');
  }
}

export type EmpresaDePrueba = 'A1' | 'A2' | 'B';

/** Atajos de las pruebas de las funciones: crear un correo de una empresa, tomar pendientes y leer una fila. */
export function ayudantesDeBandeja(bandeja: BandejaDePrueba) {
  const unCorreo = (empresa: EmpresaDePrueba, resto: Partial<CorreoDePrueba> = {}) => {
    const { escenario } = bandeja;
    const empresaId = { A1: escenario.empresaA1, A2: escenario.empresaA2, B: escenario.empresaB }[empresa];
    const cuentaId = empresa === 'B' ? escenario.cuentaB : escenario.cuentaA;
    return insertarCorreo(bandeja.propietario, { cuentaId, empresaId, ...resto });
  };
  const tomar = (limite = 10, minutos = 5) =>
    bandeja.aplicacion.query('select * from core.tomar_correos_pendientes($1, $2)', [limite, minutos]);
  const fila = async (id: string) =>
    (await bandeja.propietario.query('select * from core.correos_salientes where id = $1', [id])).rows[0];
  return { unCorreo, tomar, fila };
}
