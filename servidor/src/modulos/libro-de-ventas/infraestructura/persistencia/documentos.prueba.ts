/**
 * Prueba de integración contra PostgreSQL (base de pruebas): seguridad por empresa de los documentos de venta y sus
 * líneas, y las llaves compuestas con la cuenta y la empresa de la migración 0002.
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { conceptosDeIngreso } from './conceptos-de-ingreso.tablas.js';
import {
  cerrarBase,
  clienteDeB,
  conceptoDeA1,
  conceptoDeA2,
  cuentaA,
  cuentaB,
  documento,
  empresaA1,
  empresaA2,
  empresaB,
  en,
  enA1,
  insertar,
  linea,
  prepararBase,
  restriccionQueViola,
  usuarioId,
} from './documentos.soporte.js';
import { documentos } from './documentos.tablas.js';
import { lineasDeDocumento } from './lineas-de-documento.tablas.js';

beforeAll(prepararBase);
afterAll(cerrarBase);

describe('documentos: seguridad por empresa y llaves', () => {
  it('cada empresa ve solo los suyos y la cuenta y las marcas se llenan solas', async () => {
    const [creado] = await insertar(documento());
    const visibles = (empresaId: string, cuentaId: string) =>
      enTransaccionSegura(en(empresaId, cuentaId), (tx) =>
        tx.select().from(documentos).where(eq(documentos.id, creado!.id)),
      );

    expect(await visibles(empresaA1, cuentaA)).toHaveLength(1);
    expect(await visibles(empresaA2, cuentaA)).toEqual([]);
    expect(await visibles(empresaB, cuentaB)).toEqual([]);
    expect(creado).toMatchObject({ cuentaId: cuentaA, creadoPor: usuarioId, estado: 'vigente', moneda: 'GTQ' });
  });

  it('no se escribe a nombre de otra empresa ni con el cliente de otra cuenta', async () => {
    await expect(insertar(documento({ empresaId: empresaA2 }))).rejects.toThrow();
    expect(await restriccionQueViola(insertar(documento({ clienteId: clienteDeB })))).toBe('documentos_cliente_fk');
  });

  it('la factura que corrige una nota es de la misma empresa', async () => {
    const [deA2] = await insertar(documento({ empresaId: empresaA2 }), en(empresaA2, cuentaA));
    const nota = documento({ tipo: 'nota_de_credito', documentoAfectadoId: deA2!.id });

    expect(await restriccionQueViola(insertar(nota))).toBe('documentos_afectado_fk');
  });

  it('una localidad solo se cita si es de la empresa', async () => {
    const intento = insertar(documento({ localidadId: crypto.randomUUID() }));

    expect(await restriccionQueViola(intento)).toBe('documentos_localidad_fk');
  });
});

describe('líneas de documento', () => {
  it('se guardan con el documento y se borran con él', async () => {
    const [padre] = await insertar(documento());
    await enTransaccionSegura(enA1(), (tx) => tx.insert(lineasDeDocumento).values(linea(padre!.id)));

    await enTransaccionSegura(enA1(), (tx) => tx.delete(documentos).where(eq(documentos.id, padre!.id)));

    const restantes = await enTransaccionSegura(enA1(), (tx) =>
      tx.select().from(lineasDeDocumento).where(eq(lineasDeDocumento.documentoId, padre!.id)),
    );
    expect(restantes).toEqual([]);
  });

  it('el concepto es de la misma empresa y un concepto con líneas no se borra', async () => {
    const [padre] = await insertar(documento());
    const ajeno = await restriccionQueViola(
      enTransaccionSegura(enA1(), (tx) =>
        tx.insert(lineasDeDocumento).values(linea(padre!.id, { conceptoDeIngresoId: conceptoDeA2 })),
      ),
    );
    await enTransaccionSegura(enA1(), (tx) => tx.insert(lineasDeDocumento).values(linea(padre!.id)));

    const borrado = await restriccionQueViola(
      enTransaccionSegura(enA1(), (tx) => tx.delete(conceptosDeIngreso).where(eq(conceptosDeIngreso.id, conceptoDeA1))),
    );

    expect(ajeno).toBe('lineas_de_documento_concepto_fk');
    expect(borrado).toBe('lineas_de_documento_concepto_fk');
  });

  it.each([
    ['total que no cuadra', { total: '113.00' }, 'lineas_de_documento_totales_cuadran'],
    ['IVA en una línea exenta', { claseFiscal: 'exenta' as const }, 'lineas_de_documento_solo_la_gravada_lleva_iva'],
    ['clase desconocida', { claseFiscal: 'otra' as never }, 'lineas_de_documento_clase_valida'],
    ['tipo desconocido', { tipo: 'mixto' as never }, 'lineas_de_documento_tipo_valido'],
    ['base negativa', { base: '-1.00', iva: '113.00' }, 'lineas_de_documento_montos_validos'],
  ] as const)('rechaza %s', async (_caso, cambios, restriccion) => {
    const [padre] = await insertar(documento());

    const intento = enTransaccionSegura(enA1(), (tx) =>
      tx.insert(lineasDeDocumento).values(linea(padre!.id, cambios as never)),
    );

    expect(await restriccionQueViola(intento)).toBe(restriccion);
  });

  it('el orden no se repite dentro del documento', async () => {
    const [padre] = await insertar(documento());
    await enTransaccionSegura(enA1(), (tx) => tx.insert(lineasDeDocumento).values(linea(padre!.id)));

    const repetida = enTransaccionSegura(enA1(), (tx) => tx.insert(lineasDeDocumento).values(linea(padre!.id)));

    expect(await restriccionQueViola(repetida)).toBe('lineas_de_documento_orden_unico');
  });
});
