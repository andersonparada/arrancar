/**
 * Prueba de integración contra PostgreSQL (base de pruebas): los `check` de «por resolver» en `retenciones` y la
 * tabla `enteros_de_retenciones` con su seguridad por empresa.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import {
  contextoDe,
  documentoValido,
  errorDePostgres,
  insertarDocumento,
  prepararEscenario,
  type Escenario,
} from './documentos.soporte.js';
import { enterosDeRetenciones } from './enteros-de-retenciones.tablas.js';
import { retenciones } from './retenciones.tablas.js';

let e: Escenario;
let facturaA1: string;
const USUARIO = '00000000-0000-4000-8000-000000000001';

const enA1 = () => contextoDe(e, e.empresaA1, e.cuentaA);
const enA2 = () => contextoDe(e, e.empresaA2, e.cuentaA);

const retencionValida = (cambios: Record<string, unknown> = {}) =>
  ({
    empresaId: e.empresaA1,
    documentoId: facturaA1,
    impuesto: 'iva',
    regla: 'iva_exportador',
    base: '100',
    porcentaje: '15',
    montoPropuesto: '10',
    monto: '10',
    fecha: '2026-03-10',
    ...cambios,
  }) as typeof retenciones.$inferInsert;
const restriccionDeRetencion = async (cambios: Record<string, unknown>) =>
  (
    await errorDePostgres(
      enTransaccionSegura(enA1(), (tx) => tx.insert(retenciones).values(retencionValida(cambios)).returning()),
    )
  )?.constraint;

const resuelta = {
  resolucion: 'rectificada',
  notaDeResolucion: 'Se rectificó el entero',
  resueltaEn: new Date(),
  resueltaPor: USUARIO,
};

const enteroValido = (cambios: Record<string, unknown> = {}) =>
  ({
    empresaId: e.empresaA1,
    mes: '2026-03-01',
    grupo: 'iva_agentes',
    fechaDePago: '2026-04-15',
    documentoDePago: 'SAT2046',
    monto: '150.00',
    retenidoAlMarcar: '150.00',
    ...cambios,
  }) as typeof enterosDeRetenciones.$inferInsert;
const insertarEntero = (cambios: Record<string, unknown> = {}, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(enterosDeRetenciones).values(enteroValido(cambios)).returning());
const restriccionDeEntero = async (cambios: Record<string, unknown>) =>
  (await errorDePostgres(insertarEntero(cambios)))?.constraint;

beforeAll(async () => {
  e = await prepararEscenario('porresolver');
  facturaA1 = await insertarDocumento(documentoValido(e), enA1());
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('retenciones por resolver: cada check', () => {
  it.each([
    // PostgreSQL informa el primero que falla, por orden alfabético: `completa` va antes que `valida`.
    ['resolucion_completa', { resolucion: 'olvidada' }],
    ['resolucion_solo_practicada', { monto: '0', montoPropuesto: '0', resolucion: 'pendiente' }],
    ['resolucion_completa', { resolucion: 'rectificada' }],
    ['resolucion_completa', { resolucion: 'pendiente', resueltaEn: new Date(), resueltaPor: USUARIO }],
    ['nota_de_resolucion_rango', { ...resuelta, notaDeResolucion: 'x'.repeat(301) }],
  ])('rechaza %s', async (nombre, cambios) => {
    expect(await restriccionDeRetencion(cambios)).toBe(`retenciones_${nombre}`);
  });

  it('acepta pendiente sin datos de resolución y una resolución completa', async () => {
    const pendiente = enTransaccionSegura(enA1(), (tx) =>
      tx
        .insert(retenciones)
        .values(retencionValida({ resolucion: 'pendiente' }))
        .returning(),
    );
    await expect(pendiente).resolves.toHaveLength(1);

    const completa = enTransaccionSegura(enA1(), (tx) =>
      tx
        .insert(retenciones)
        .values(retencionValida({ regla: 'iva_otro_agente', ...resuelta }))
        .returning(),
    );
    await expect(completa).resolves.toHaveLength(1);
  });
});

describe('enteros de retenciones: cada check', () => {
  it.each([
    ['mes_primer_dia', { mes: '2026-03-15' }],
    ['grupo_valido', { grupo: 'otro' }],
    ['fecha_de_pago', { fechaDePago: '2026-02-28' }],
    ['documento_de_pago', { documentoDePago: 'con espacio' }],
    ['documento_de_pago', { documentoDePago: '' }],
    ['monto_positivo', { monto: '0' }],
    ['retenido_no_negativo', { retenidoAlMarcar: '-1' }],
    ['observaciones_rango', { observaciones: '' }],
    ['estado_valido', { estado: 'perdido' }],
    ['anulacion_completa', { estado: 'anulado' }],
    ['anulacion_completa', { anuladoEn: new Date(), anuladoPor: USUARIO, motivoDeAnulacion: 'Error' }],
    ['motivo_rango', { estado: 'anulado', anuladoEn: new Date(), anuladoPor: USUARIO, motivoDeAnulacion: '' }],
  ])('rechaza %s', async (nombre, cambios) => {
    expect(await restriccionDeEntero(cambios)).toBe(`enteros_de_retenciones_${nombre}`);
  });

  it('acepta varios pagos del mismo mes y grupo y un pago anulado con sus tres datos', async () => {
    await expect(insertarEntero()).resolves.toHaveLength(1);
    await expect(insertarEntero({ documentoDePago: 'SAT2046C', monto: '20.00' })).resolves.toHaveLength(1);
    const anulado = {
      estado: 'anulado',
      anuladoEn: new Date(),
      anuladoPor: USUARIO,
      motivoDeAnulacion: 'Pago repetido',
    };
    await expect(insertarEntero(anulado)).resolves.toHaveLength(1);
  });
});

describe('enteros de retenciones: seguridad por empresa', () => {
  it('cada empresa ve solo los suyos y no se escribe en otra', async () => {
    const visibles = (contexto: ReturnType<typeof enA1>) =>
      enTransaccionSegura(contexto, (tx) => tx.select().from(enterosDeRetenciones));

    expect((await visibles(enA1())).length).toBeGreaterThan(0);
    expect(await visibles(enA2())).toEqual([]);
    await expect(insertarEntero({}, enA2())).rejects.toThrow();
  });
});
