/**
 * Prueba de integración contra PostgreSQL: la función `autorizacion_registrada_fuera` responde solo sí o no, y solo
 * por las demás empresas de la misma cuenta (pregunta L4-c: en otra cuenta no se avisa nada).
 */
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { documentos } from './documentos.tablas.js';
import {
  contextoDe,
  documentoValido,
  insertarDocumento,
  prepararEscenario,
  type Escenario,
} from './documentos.soporte.js';

let e: Escenario;

const enA1 = () => contextoDe(e, e.empresaA1, e.cuentaA);
const enA2 = () => contextoDe(e, e.empresaA2, e.cuentaA);
const enB = () => contextoDe(e, e.empresaB, e.cuentaB);

async function registradaFuera(contexto: ContextoEmpresa, autorizacion: string): Promise<boolean> {
  const resultado = await enTransaccionSegura(contexto, (tx) =>
    tx.execute<{ respuesta: boolean }>(
      sql`select libro_de_compras.autorizacion_registrada_fuera(${autorizacion}::uuid) as respuesta`,
    ),
  );
  return resultado.rows[0]!.respuesta;
}

const registrarEnA1 = async () => {
  const autorizacionFel = crypto.randomUUID();
  const id = await insertarDocumento(documentoValido(e, { autorizacionFel }), enA1());
  return { autorizacionFel, id };
};

beforeAll(async () => {
  e = await prepararEscenario('autorizacionfuera');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('autorizacion_registrada_fuera', () => {
  it('otra empresa de la misma cuenta ve que el DTE ya está registrado', async () => {
    const { autorizacionFel } = await registrarEnA1();

    expect(await registradaFuera(enA2(), autorizacionFel)).toBe(true);
  });

  it('la propia empresa responde no: lo suyo lo ve con su propia seguridad', async () => {
    const { autorizacionFel } = await registrarEnA1();

    expect(await registradaFuera(enA1(), autorizacionFel)).toBe(false);
  });

  it('otra cuenta responde no, sin avisar nada', async () => {
    const { autorizacionFel } = await registrarEnA1();

    expect(await registradaFuera(enB(), autorizacionFel)).toBe(false);
  });

  it('una autorización que nadie registró responde no', async () => {
    expect(await registradaFuera(enA2(), crypto.randomUUID())).toBe(false);
  });

  it('un documento anulado ya no cuenta', async () => {
    const { autorizacionFel, id } = await registrarEnA1();
    await enTransaccionSegura(enA1(), (tx) =>
      tx
        .update(documentos)
        .set({
          estado: 'anulado',
          anuladoEn: new Date(),
          anuladoPor: e.usuarioId,
          motivoDeAnulacion: 'Prueba',
          causaDeAnulacion: 'error_de_captura',
        })
        .where(eq(documentos.id, id)),
    );

    expect(await registradaFuera(enA2(), autorizacionFel)).toBe(false);
  });

  it('sin empresa ni cuenta en la transacción responde no', async () => {
    const { autorizacionFel } = await registrarEnA1();

    const resultado = await bd.execute<{ respuesta: boolean }>(
      sql`select libro_de_compras.autorizacion_registrada_fuera(${autorizacionFel}::uuid) as respuesta`,
    );

    expect(resultado.rows[0]!.respuesta).toBe(false);
  });

  it('solo devuelve un sí o un no, y la app puede llamarla pero no el público', async () => {
    const [{ tipo, definidor, ejecutable }] = (
      await enTransaccionSegura(enA1(), (tx) =>
        tx.execute<{ tipo: string; definidor: boolean; ejecutable: boolean }>(sql`
          select pg_catalog.format_type(prorettype, null) as tipo, prosecdef as definidor,
                 has_function_privilege('arrancar_app', oid, 'execute') as ejecutable
          from pg_proc where oid = 'libro_de_compras.autorizacion_registrada_fuera(uuid)'::regprocedure`),
      )
    ).rows as [{ tipo: string; definidor: boolean; ejecutable: boolean }];

    expect({ tipo, definidor, ejecutable }).toEqual({ tipo: 'boolean', definidor: true, ejecutable: true });
  });
});
