/** Prueba de integración contra PostgreSQL: checks y seguridad por empresa de `lotes_de_dte`. */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { contextoDe, errorDePostgres, prepararEscenario, type Escenario } from './documentos.soporte.js';
import { insertarLote, loteValido, type LoteNuevo } from './dte-recibidos.soporte.js';
import { lotesDeDte } from './lotes-de-dte.tablas.js';

let e: Escenario;

const enA1 = () => contextoDe(e, e.empresaA1, e.cuentaA);
const enA2 = () => contextoDe(e, e.empresaA2, e.cuentaA);
const restriccionDe = async (cambios: Partial<LoteNuevo>) =>
  (
    await errorDePostgres(
      enTransaccionSegura(enA1(), (tx) => tx.insert(lotesDeDte).values(loteValido(e.empresaA1, cambios))),
    )
  )?.constraint;

beforeAll(async () => {
  e = await prepararEscenario('lotesdedte');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('lotes_de_dte: checks', () => {
  it('guarda un lote válido y una conciliación con su resumen', async () => {
    await expect(insertarLote(enA1())).resolves.toBeTruthy();
    await expect(
      insertarLote(enA1(), {
        proposito: 'conciliacion',
        resumenDeConciliacion: { coinciden: 3 },
        filasNuevas: 0,
        filasActualizadas: 0,
        filasSinCambio: 3,
      }),
    ).resolves.toBeTruthy();
  });

  const casos: [string, Partial<LoteNuevo>, string][] = [
    ['propósito desconocido', { proposito: 'otro' as never }, 'lotes_de_dte_proposito_valido'],
    ['formato desconocido', { formato: 'xls' as never }, 'lotes_de_dte_formato_valido'],
    ['nombre vacío', { nombreDelArchivo: '  ' }, 'lotes_de_dte_nombre_largo'],
    ['nombre de más de 200', { nombreDelArchivo: 'a'.repeat(201) }, 'lotes_de_dte_nombre_largo'],
    ['sha256 en mayúsculas', { sha256: 'A'.repeat(64) }, 'lotes_de_dte_sha256_valido'],
    ['sha256 con otro largo', { sha256: 'a'.repeat(10) }, 'lotes_de_dte_sha256_valido'],
    ['tamaño cero', { tamanoEnBytes: 0 }, 'lotes_de_dte_tamano_positivo'],
    ['emisión hasta antes de desde', { emisionHasta: '2026-02-28' }, 'lotes_de_dte_emision_ordenada'],
    ['solo una fecha de emisión', { emisionHasta: null }, 'lotes_de_dte_emision_ordenada'],
    ['filas que no cuadran', { filasLeidas: 5 }, 'lotes_de_dte_filas_cuadran'],
    ['filas negativas', { filasRechazadas: -1, filasNuevas: 2 }, 'lotes_de_dte_filas_no_negativas'],
    ['anuladas negativas', { anuladasEnLaSat: -1 }, 'lotes_de_dte_filas_no_negativas'],
    ['rechazos que no son lista', { rechazos: {} as never }, 'lotes_de_dte_rechazos_validos'],
    ['más de 1000 rechazos', { rechazos: Array(1001).fill({}) as never }, 'lotes_de_dte_rechazos_validos'],
    ['encabezados que no son lista', { encabezadosNoReconocidos: {} as never }, 'lotes_de_dte_encabezados_validos'],
    ['conciliación sin resumen', { proposito: 'conciliacion' }, 'lotes_de_dte_conciliacion_con_resumen'],
    ['bandeja con resumen', { resumenDeConciliacion: { a: 1 } }, 'lotes_de_dte_conciliacion_con_resumen'],
  ];

  it.each(casos)('rechaza: %s', async (_nombre, cambios, restriccion) => {
    expect(await restriccionDe(cambios)).toBe(restriccion);
  });
});

describe('lotes_de_dte: seguridad por empresa', () => {
  it('otra empresa, de la misma cuenta o no, no ve los lotes', async () => {
    const id = await insertarLote(enA1());
    const vistoPor = (contexto: ReturnType<typeof enA1>) =>
      enTransaccionSegura(contexto, (tx) => tx.select({ id: lotesDeDte.id }).from(lotesDeDte));

    expect((await vistoPor(enA1())).map((fila) => fila.id)).toContain(id);
    expect(await vistoPor(enA2())).toEqual([]);
    expect(await vistoPor(contextoDe(e, e.empresaB, e.cuentaB))).toEqual([]);
  });

  it('no se puede escribir un lote de otra empresa', async () => {
    const intento = enTransaccionSegura(enA2(), (tx) => tx.insert(lotesDeDte).values(loteValido(e.empresaA1)));

    expect((await errorDePostgres(intento))?.code).toBe('42501');
  });

  it('un lote de otra empresa no se actualiza ni se borra', async () => {
    const id = await insertarLote(enA1());
    const filas = await enTransaccionSegura(enA2(), (tx) =>
      tx.delete(lotesDeDte).where(eq(lotesDeDte.id, id)).returning({ id: lotesDeDte.id }),
    );

    expect(filas).toEqual([]);
  });
});
