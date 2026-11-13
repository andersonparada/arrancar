/**
 * Prueba de integración contra PostgreSQL: los ajustes del saldo libre de una nota (monto, causa, referencia, anulación
 * completa, mismo proveedor, cascada y aislamiento por empresa).
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { ajustesDeSaldo } from './ajustes-de-saldo.tablas.js';
import { documentos } from './documentos.tablas.js';
import {
  contextoDe,
  crearDocumentoDeLibro,
  documentoValido,
  errorDePostgres,
  prepararEscenario,
  type Escenario,
} from './escenario.soporte.js';

let e: Escenario;
const contexto = () => contextoDe(e, e.empresaA1, e.cuentaA);

async function crear(proveedorId: string, cambios: Record<string, unknown> = {}) {
  const documentoId = await crearDocumentoDeLibro(contexto(), proveedorId);
  const [fila] = await enTransaccionSegura(contexto(), (tx) =>
    tx
      .insert(documentos)
      .values(documentoValido(e, documentoId, { proveedorId, ...cambios }))
      .returning(),
  );
  return fila!;
}

async function unaNota(proveedorId = e.proveedorA) {
  const factura = await crear(proveedorId);
  return crear(proveedorId, {
    tipo: 'nota_de_credito',
    vencimiento: null,
    documentoAfectadoId: factura.documentoId,
  });
}

const BASE = { fecha: '2026-04-01', causa: 'no_recuperable', motivo: 'El proveedor cerró' };

const ajustar = (documentoId: string, cambios: Record<string, unknown> = {}, proveedorId = e.proveedorA) =>
  enTransaccionSegura(contexto(), (tx) =>
    tx
      .insert(ajustesDeSaldo)
      .values({ empresaId: e.empresaA1, proveedorId, documentoId, monto: '10', ...BASE, ...cambios })
      .returning(),
  );

const restriccion = async (documentoId: string, cambios: Record<string, unknown>) =>
  (await errorDePostgres(ajustar(documentoId, cambios)))?.constraint;

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagarajustes');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('ajustes de saldo', () => {
  it('guarda un ajuste vigente de una nota', async () => {
    const nota = await unaNota();

    const [fila] = await ajustar(nota.id);

    expect(fila).toMatchObject({ estado: 'vigente', causa: 'no_recuperable', referencia: null, anuladoEn: null });
  });

  it('el monto es positivo, el motivo va de 1 a 300 y la causa es una de las tres', async () => {
    const nota = await unaNota();

    expect(await restriccion(nota.id, { monto: '0' })).toBe('ajustes_monto_positivo');
    expect(await restriccion(nota.id, { motivo: '' })).toBe('ajustes_motivo_rango');
    expect(await restriccion(nota.id, { motivo: 'x'.repeat(301) })).toBe('ajustes_motivo_rango');
    expect(await restriccion(nota.id, { causa: 'otra' })).toBe('ajustes_causa_valida');
    expect(await restriccion(nota.id, { causa: 'liquidado_fuera_del_sistema' })).toBe('ajustes_causa_valida');
  });

  it('compensar con otra cuenta exige referencia; la referencia va recortada y de hasta 100', async () => {
    const nota = await unaNota();
    const compensado = { causa: 'compensado_con_otra_cuenta' };

    expect(await restriccion(nota.id, compensado)).toBe('ajustes_referencia_de_compensacion');
    expect(await restriccion(nota.id, { ...compensado, referencia: ' FEL 55 ' })).toBe('ajustes_referencia_valida');
    expect(await restriccion(nota.id, { referencia: '' })).toBe('ajustes_referencia_valida');
    expect(await restriccion(nota.id, { referencia: 'x'.repeat(101) })).toBe('ajustes_referencia_valida');
    await expect(ajustar(nota.id, { ...compensado, referencia: 'FEL 55' })).resolves.toBeDefined();
  });

  it('el estado es vigente o anulado, y anulado trae fecha, usuario y motivo', async () => {
    const nota = await unaNota();
    const anulacion = { estado: 'anulado', anuladoEn: new Date(), anuladoPor: e.usuarioId };

    expect(await restriccion(nota.id, { estado: 'borrado' })).toBe('ajustes_estado_valido');
    expect(await restriccion(nota.id, { estado: 'anulado' })).toBe('ajustes_anulacion_completa');
    expect(await restriccion(nota.id, { ...anulacion })).toBe('ajustes_anulacion_completa');
    expect(await restriccion(nota.id, { ...anulacion, estado: 'vigente', motivoDeAnulacion: 'Error' })).toBe(
      'ajustes_anulacion_completa',
    );
    expect(await restriccion(nota.id, { ...anulacion, motivoDeAnulacion: '' })).toBe(
      'ajustes_motivo_de_anulacion_rango',
    );
    await expect(ajustar(nota.id, { ...anulacion, motivoDeAnulacion: 'Error' })).resolves.toBeDefined();
  });

  it('rechaza ajustar con otro proveedor que el de la nota', async () => {
    const nota = await unaNota();

    const error = await errorDePostgres(ajustar(nota.id, {}, e.proveedorA2));

    expect(error?.constraint).toBe('ajustes_documento_fk');
  });

  it('al eliminar la nota se van sus ajustes', async () => {
    const nota = await unaNota();
    await ajustar(nota.id);

    await enTransaccionSegura(contexto(), (tx) => tx.delete(documentos).where(eq(documentos.id, nota.id)));
    const quedan = await enTransaccionSegura(contexto(), (tx) =>
      tx.select().from(ajustesDeSaldo).where(eq(ajustesDeSaldo.documentoId, nota.id)),
    );

    expect(quedan).toEqual([]);
  });

  it('cada empresa ve solo sus ajustes', async () => {
    const nota = await unaNota();
    await ajustar(nota.id);

    const enA2 = await enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) =>
      tx.select().from(ajustesDeSaldo),
    );

    expect(enA2).toEqual([]);
  });
});
