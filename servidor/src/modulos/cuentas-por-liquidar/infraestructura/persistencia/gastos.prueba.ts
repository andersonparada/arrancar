/**
 * Prueba de integración contra PostgreSQL: los gastos de los anticipos (documento del libro o sin documento, bandeja,
 * únicos, llaves compuestas hacia el anticipo y el concepto, anulación y seguridad por empresa).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import {
  crearAnticipo,
  crearGasto,
  valorDeGastoDeDocumento,
  valorDeGastoSinDocumento,
} from './datos-de-cuentas-por-liquidar.soporte.js';
import { contextoDe, prepararEscenario, restriccion, type Escenario } from './escenario.soporte.js';
import { gastos } from './gastos.tablas.js';

let e: Escenario;
let anticipoId: string;

beforeAll(async () => {
  e = await prepararEscenario();
  anticipoId = (await crearAnticipo(e)).id;
});

afterAll(async () => {
  await grupoConexiones.end();
});

type Valores = Partial<typeof gastos.$inferInsert>;
const hacerQue = async (valores: Promise<typeof gastos.$inferInsert> | typeof gastos.$inferInsert) =>
  restriccion(crearGasto(e, await valores));
const sinDocumento = (cambios: Valores = {}) => valorDeGastoSinDocumento(e, anticipoId, cambios);
const deDocumento = (cambios: Valores = {}, anticipo: string | null = anticipoId) =>
  valorDeGastoDeDocumento(e, anticipo, cambios);

describe('gastos: documento del libro', () => {
  it('guarda un documento asignado al anticipo, vigente', async () => {
    const fila = await crearGasto(e, await deDocumento());

    expect(fila).toMatchObject({ clase: 'documento', estado: 'vigente', resta: false, sinBancarizar: false });
    expect(fila.creadoPor).toBe(e.usuarioId);
  });

  it('un documento del libro entra una sola vez y debe existir', async () => {
    const valores = await deDocumento();
    await crearGasto(e, valores);

    expect(await hacerQue({ ...valores, fecha: '2026-03-12' })).toBe('gastos_documento_unico');
    expect(await hacerQue(deDocumento({ documentoDeCompraId: crypto.randomUUID() }))).toBe(
      'gastos_documento_de_compra_id_documentos_id_fk',
    );
  });

  it('el documento lleva su proveedor, el monto es positivo y solo el documento resta', async () => {
    expect(await hacerQue(deDocumento({ documentoDeCompraId: null }))).toBe('gastos_documento_de_su_clase');
    expect(await hacerQue(deDocumento({ proveedorId: null }))).toBe('gastos_documento_con_proveedor');
    expect(await hacerQue(deDocumento({ proveedorId: crypto.randomUUID() }))).toBe(
      'gastos_proveedor_id_proveedores_id_fk',
    );
    expect(await hacerQue(deDocumento({ monto: '0' }))).toBe('gastos_monto_positivo');
    await expect(crearGasto(e, await deDocumento({ resta: true }))).resolves.toMatchObject({ resta: true });
    expect(await hacerQue(sinDocumento({ resta: true }))).toBe('gastos_resta_solo_en_documentos');
  });

  it('en la bandeja (sin anticipo) caben documentos, sin datos de asignación', async () => {
    await expect(crearGasto(e, await deDocumento({}, null))).resolves.toMatchObject({ anticipoId: null });

    expect(await hacerQue(sinDocumento({ anticipoId: null, asignadoEn: null, asignadoPor: null }))).toBe(
      'gastos_sin_documento_exige_anticipo',
    );
    expect(await hacerQue(deDocumento({ asignadoEn: new Date(), asignadoPor: e.usuarioId }, null))).toBe(
      'gastos_asignacion_completa',
    );
    expect(await hacerQue(deDocumento({ asignadoEn: null }))).toBe('gastos_asignacion_completa');
    expect(await hacerQue(deDocumento({ asignadoPor: null }))).toBe('gastos_asignacion_completa');
  });

  it('el anticipo es de la misma empresa (llave compuesta)', async () => {
    expect(await hacerQue(deDocumento({ anticipoId: crypto.randomUUID() }))).toBe('gastos_anticipo_fk');
    const intento = enTransaccionSegura(contextoDe(e, e.empresaA2), async (tx) =>
      tx.insert(gastos).values({ ...(await sinDocumento()), empresaId: e.empresaA2 }),
    );

    expect(await restriccion(intento)).toBe('gastos_anticipo_fk');
  });
});

describe('gastos: sin documento', () => {
  it('guarda un gasto con su descripción, a quién se pagó, concepto, motivo y tratamiento', async () => {
    await expect(crearGasto(e, await sinDocumento())).resolves.toMatchObject({
      clase: 'sin_documento',
      tratamientoSinDocumento: 'no_deducible',
    });
    await expect(
      crearGasto(e, await sinDocumento({ tratamientoSinDocumento: 'renta_del_trabajo' })),
    ).resolves.toBeDefined();
  });

  it('la clase es una de las dos y no lleva documento del libro', async () => {
    expect(await hacerQue(sinDocumento({ clase: 'otra' as never }))).toBe('gastos_clase_valida');
    expect(await hacerQue(sinDocumento({ documentoDeCompraId: crypto.randomUUID() }))).toBe(
      'gastos_documento_de_su_clase',
    );
  });

  it('la descripción, a quién se pagó y el motivo son obligatorios y van recortados', async () => {
    expect(await hacerQue(sinDocumento({ descripcion: null }))).toBe('gastos_descripcion_obligatoria');
    expect(await hacerQue(sinDocumento({ descripcion: ' Taxi ' }))).toBe('gastos_descripcion_valida');
    expect(await hacerQue(sinDocumento({ pagadoA: null }))).toBe('gastos_pagado_a_de_su_clase');
    expect(await hacerQue(sinDocumento({ pagadoA: 'x'.repeat(151) }))).toBe('gastos_pagado_a_valido');
    expect(await hacerQue(sinDocumento({ motivoSinDocumento: null }))).toBe('gastos_motivo_sin_documento_de_su_clase');
    expect(await hacerQue(sinDocumento({ motivoSinDocumento: '' }))).toBe('gastos_motivo_sin_documento_rango');
    expect(await hacerQue(deDocumento({ motivoSinDocumento: 'No hubo' }))).toBe(
      'gastos_motivo_sin_documento_de_su_clase',
    );
  });

  it('el concepto es obligatorio y de la misma empresa (llave compuesta)', async () => {
    expect(await hacerQue(sinDocumento({ conceptoDeGastoId: null }))).toBe('gastos_concepto_del_gasto');
    expect(await hacerQue(sinDocumento({ conceptoDeGastoId: e.conceptoDeGastoA2 }))).toBe(
      'gastos_concepto_de_gasto_fk',
    );
  });

  it('el tratamiento es obligatorio y es no deducible o renta del trabajo', async () => {
    expect(await hacerQue(sinDocumento({ tratamientoSinDocumento: null }))).toBe('gastos_tratamiento_de_su_clase');
    expect(await hacerQue(sinDocumento({ tratamientoSinDocumento: 'deducible' as never }))).toBe(
      'gastos_tratamiento_valido',
    );
    expect(await hacerQue(deDocumento({ tratamientoSinDocumento: 'no_deducible' }))).toBe(
      'gastos_tratamiento_de_su_clase',
    );
  });
});

describe('gastos: estado, anulación y seguridad', () => {
  const completa = () => ({ anuladoEn: new Date(), anuladoPor: e.usuarioId, motivoDeAnulacion: 'Error' });

  it('el estado es vigente o anulado y la anulación se escribe completa', async () => {
    expect(await hacerQue(sinDocumento({ estado: 'repuesto' as never }))).toBe('gastos_estado_valido');
    expect(await hacerQue(sinDocumento({ estado: 'anulado' }))).toBe('gastos_anulacion_completa');
    expect(await hacerQue(sinDocumento({ anuladoEn: new Date() }))).toBe('gastos_anulacion_completa');
  });

  it('la fecha contable de la anulación va si y solo si está anulado y no es anterior a la del gasto', async () => {
    const anulado = (fechaDeAnulacion?: string) => sinDocumento({ estado: 'anulado', ...completa(), fechaDeAnulacion });

    expect(await hacerQue(anulado())).toBe('gastos_fecha_de_anulacion_de_su_estado');
    expect(await hacerQue(anulado('2026-03-10'))).toBe('gastos_fecha_de_anulacion_valida');
    expect(
      await hacerQue(
        sinDocumento({ ...completa(), estado: 'anulado', fechaDeAnulacion: '2026-03-11', motivoDeAnulacion: '' }),
      ),
    ).toBe('gastos_motivo_de_anulacion_rango');
    await expect(crearGasto(e, await anulado('2026-03-11'))).resolves.toBeDefined();
  });

  it('otra empresa no ve los gastos', async () => {
    await crearGasto(e, await sinDocumento());

    const vistos = await enTransaccionSegura(contextoDe(e, e.empresaA2), (tx) => tx.select().from(gastos));
    expect(vistos).toHaveLength(0);
  });
});
