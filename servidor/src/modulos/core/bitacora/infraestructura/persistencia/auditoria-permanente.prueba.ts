/**
 * Prueba de integración contra PostgreSQL: `core.depurar_auditoria` no borra las entradas con empresa de los recursos
 * del catálogo `core.recursos_de_auditoria_permanente`, y la app no puede escribir en el catálogo.
 */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../../configuracion.js';
import { migrarModulos } from '../../../base-datos/migrador.js';
import { definicionesModulos } from '../../../../indice.js';
import { DepuradorDeAuditoriaDrizzle } from './depurador-de-auditoria.drizzle.js';
import { bd, grupoConexiones } from '../../../base-datos/conexion.js';

let propietario: pg.Client;
let aplicacion: pg.Client;
let cuentaId: string;
let empresaId: string;

const RECURSO_PERMANENTE = 'prueba-permanente.registros';

async function insertarEntrada(registroId: string, opciones: { recurso: string; empresa: boolean; meses: number }) {
  await propietario.query(
    `insert into core.auditoria (cuenta_id, empresa_id, recurso, registro_id, accion, creado_en)
     values ($1, $2, $3, $4, 'cerrar', now() - make_interval(months => $5))`,
    [cuentaId, opciones.empresa ? empresaId : null, opciones.recurso, registroId, opciones.meses],
  );
}

async function registrosDeLaPrueba(): Promise<string[]> {
  const { rows } = await propietario.query<{ registro_id: string }>(
    'select registro_id from core.auditoria where cuenta_id = $1 order by registro_id',
    [cuentaId],
  );
  return rows.map((fila) => fila.registro_id);
}

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  aplicacion = new pg.Client({ connectionString: configuracion.DATABASE_URL });
  await propietario.connect();
  await aplicacion.connect();
  await propietario.query('truncate core.cuentas, core.usuarios cascade');
  cuentaId = (await propietario.query('insert into core.cuentas (nombre) values ($1) returning id', ['C'])).rows[0].id;
  empresaId = (
    await propietario.query('insert into core.empresas (cuenta_id, nombre) values ($1, $2) returning id', [
      cuentaId,
      'E',
    ])
  ).rows[0].id;
  await propietario.query('insert into core.recursos_de_auditoria_permanente (recurso, motivo) values ($1, $2)', [
    RECURSO_PERMANENTE,
    'Prueba',
  ]);
});

afterAll(async () => {
  await propietario.query('delete from core.recursos_de_auditoria_permanente where recurso = $1', [RECURSO_PERMANENTE]);
  await propietario.query('delete from core.auditoria where cuenta_id = $1', [cuentaId]);
  await propietario.query('truncate core.cuentas, core.usuarios cascade');
  await propietario.end();
  await aplicacion.end();
  await grupoConexiones.end();
});

describe('conservación de la auditoría permanente', () => {
  it('conserva la de un recurso del catálogo con empresa y depura lo demás', async () => {
    await insertarEntrada('permanente-con-empresa', { recurso: RECURSO_PERMANENTE, empresa: true, meses: 61 });
    await insertarEntrada('permanente-sin-empresa', { recurso: RECURSO_PERMANENTE, empresa: false, meses: 61 });
    await insertarEntrada('otro-recurso', { recurso: 'otro.recurso', empresa: true, meses: 61 });
    await insertarEntrada('permanente-reciente', { recurso: RECURSO_PERMANENTE, empresa: true, meses: 13 });
    await insertarEntrada('otro-reciente', { recurso: 'otro.recurso', empresa: true, meses: 13 });

    const borradas = await new DepuradorDeAuditoriaDrizzle(bd).borrarAnterioresA(0);

    expect(borradas).toBe(2);
    expect(await registrosDeLaPrueba()).toEqual(['otro-reciente', 'permanente-con-empresa', 'permanente-reciente']);
  });

  it('al borrarse la empresa, la entrada pierde la excepción y se depura', async () => {
    await propietario.query('delete from core.empresas where id = $1', [empresaId]);

    await new DepuradorDeAuditoriaDrizzle(bd).borrarAnterioresA(60);

    expect(await registrosDeLaPrueba()).toEqual(['otro-reciente', 'permanente-reciente']);
  });

  it('la app solo puede leer el catálogo: insertar, cambiar y borrar los rechaza RLS', async () => {
    const leidas = await aplicacion.query('select recurso from core.recursos_de_auditoria_permanente');
    await expect(
      aplicacion.query('insert into core.recursos_de_auditoria_permanente (recurso, motivo) values ($1, $2)', [
        'otro.cosa',
        'x',
      ]),
    ).rejects.toThrow(/row-level security/);
    const cambiadas = await aplicacion.query("update core.recursos_de_auditoria_permanente set motivo = 'x'");
    const borradas = await aplicacion.query('delete from core.recursos_de_auditoria_permanente');

    expect(leidas.rows).toContainEqual({ recurso: RECURSO_PERMANENTE });
    expect(cambiadas.rowCount).toBe(0);
    expect(borradas.rowCount).toBe(0);
  });

  it('el catálogo no admite recursos mal escritos ni motivos vacíos', async () => {
    const insertar = (recurso: string, motivo: string) =>
      propietario.query('insert into core.recursos_de_auditoria_permanente (recurso, motivo) values ($1, $2)', [
        recurso,
        motivo,
      ]);

    await expect(insertar('Mal Escrito', 'x')).rejects.toThrow(/recurso_valido/);
    await expect(insertar('a.b', '  ')).rejects.toThrow(/motivo_valido/);
  });
});
