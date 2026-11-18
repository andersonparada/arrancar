/**
 * Prueba de integración contra PostgreSQL: los comprobantes de los fondos, las clases documento (con sus notas de
 * crédito) y vale de gasto, y lo que cada una exige (únicos, llaves compuestas, bandeja).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import type { comprobantes } from './comprobantes.tablas.js';
import { crearComprobante, crearFondo, valeDeGastoValido, valorDeDocumento } from './datos-de-caja-chica.soporte.js';
import {
  contextoDe,
  crearDocumentoDeLibro,
  prepararEscenario,
  restriccion,
  type Escenario,
} from './escenario.soporte.js';

let e: Escenario;
let fondoId: string;

beforeAll(async () => {
  e = await prepararEscenario();
  fondoId = (await crearFondo(e)).id;
});

afterAll(async () => {
  await grupoConexiones.end();
});

type Valores = Partial<typeof comprobantes.$inferInsert>;
const documento = async (cambios: Valores = {}) => crearComprobante(e, await valorDeDocumento(e, fondoId, cambios));
const vale = (cambios: Valores = {}) => crearComprobante(e, valeDeGastoValido(e, fondoId, cambios));
const hacerQue = async (valores: Promise<typeof comprobantes.$inferInsert> | typeof comprobantes.$inferInsert) =>
  restriccion(crearComprobante(e, await valores));

describe('comprobantes: documento del libro', () => {
  it('guarda un documento asignado al fondo, vigente y repartido como lo recibió', async () => {
    const fila = await documento();

    expect(fila).toMatchObject({ clase: 'documento', estado: 'vigente', resta: false, sinBancarizar: false });
    expect(fila.creadoPor).toBe(e.usuarioId);
  });

  it('un documento del libro entra una sola vez y debe existir', async () => {
    const valores = await valorDeDocumento(e, fondoId);
    await crearComprobante(e, valores);

    expect(await hacerQue({ ...valores, fecha: '2026-03-11' })).toBe('comprobantes_documento_unico');
    expect(await hacerQue(valorDeDocumento(e, fondoId, { documentoDeCompraId: crypto.randomUUID() }))).toBe(
      'comprobantes_documento_fk',
    );
  });

  it('el documento es de la misma empresa y con destino caja chica (llave compuesta)', async () => {
    const deOtraEmpresa = await crearDocumentoDeLibro(e, contextoDe(e, e.empresaA2));

    expect(await hacerQue(valorDeDocumento(e, fondoId, { documentoDeCompraId: deOtraEmpresa }))).toBe(
      'comprobantes_documento_fk',
    );
    expect(await hacerQue(valorDeDocumento(e, fondoId, { destinoDelDocumento: 'otro' as never }))).toBe(
      'comprobantes_destino_del_documento_fijo',
    );
  });

  it('la factura con retención (excepción de CC-f) lleva monto retenido y motivo, y solo en documentos', async () => {
    await expect(
      documento({
        conRetencion: true,
        montoRetenido: '5.60',
        motivoConRetencion: 'Proveedor retenedor',
        monto: '106.40',
      }),
    ).resolves.toMatchObject({ conRetencion: true, montoRetenido: '5.60' });

    expect(await hacerQue(valorDeDocumento(e, fondoId, { conRetencion: true, motivoConRetencion: 'Sin monto' }))).toBe(
      'comprobantes_retencion_con_monto',
    );
    expect(await hacerQue(valorDeDocumento(e, fondoId, { conRetencion: true, montoRetenido: '5' }))).toBe(
      'comprobantes_retencion_con_motivo',
    );
    expect(await hacerQue(valorDeDocumento(e, fondoId, { montoRetenido: '-1' }))).toBe(
      'comprobantes_retenido_no_negativo',
    );
    const vale = valeDeGastoValido(e, fondoId, { conRetencion: true, montoRetenido: '5', motivoConRetencion: 'No' });
    expect(await hacerQue(vale)).toBe('comprobantes_retencion_solo_en_documentos');
  });

  it('la clase documento lleva su documento y proveedor; las otras no llevan documento', async () => {
    expect(await hacerQue(valorDeDocumento(e, fondoId, { documentoDeCompraId: null }))).toBe(
      'comprobantes_documento_de_su_clase',
    );
    expect(await hacerQue(valorDeDocumento(e, fondoId, { proveedorId: null }))).toBe(
      'comprobantes_documento_con_proveedor',
    );
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { documentoDeCompraId: crypto.randomUUID() }))).toBe(
      'comprobantes_documento_de_su_clase',
    );
  });

  it('el proveedor debe existir y el monto es positivo', async () => {
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { proveedorId: crypto.randomUUID() }))).toBe(
      'comprobantes_proveedor_fk',
    );
    expect(await hacerQue(valorDeDocumento(e, fondoId, { monto: '0' }))).toBe('comprobantes_monto_positivo');
  });

  it('en la bandeja (sin fondo) solo caben documentos, y sin datos de asignación', async () => {
    await expect(crearComprobante(e, await valorDeDocumento(e, null))).resolves.toMatchObject({ fondoId: null });

    expect(await hacerQue(valeDeGastoValido(e, null))).toBe('comprobantes_clase_exige_fondo');
    expect(await hacerQue(valorDeDocumento(e, null, { asignadoEn: new Date(), asignadoPor: e.usuarioId }))).toBe(
      'comprobantes_asignacion_completa',
    );
    expect(await hacerQue(valorDeDocumento(e, fondoId, { asignadoEn: null }))).toBe('comprobantes_asignacion_completa');
    expect(await hacerQue(valorDeDocumento(e, fondoId, { asignadoPor: null }))).toBe(
      'comprobantes_asignacion_completa',
    );
  });
});

describe('comprobantes: notas de crédito y sobrantes (lo que resta)', () => {
  it('resta es verdadero en las notas de crédito y falso en lo demás', async () => {
    await expect(documento({ esNotaDeCredito: true, resta: true })).resolves.toBeDefined();

    expect(await hacerQue(valorDeDocumento(e, fondoId, { esNotaDeCredito: true }))).toBe(
      'comprobantes_resta_coherente',
    );
    expect(await hacerQue(valorDeDocumento(e, fondoId, { resta: true }))).toBe('comprobantes_resta_coherente');
  });

  it('solo un documento puede ser nota, y la factura que rebaja es del mismo fondo', async () => {
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { esNotaDeCredito: true, resta: true }))).toBe(
      'comprobantes_nota_solo_en_documentos',
    );
    const factura = await documento();
    const nota = { esNotaDeCredito: true, resta: true, documentoAfectadoId: factura.id };
    await expect(documento(nota)).resolves.toBeDefined();

    const otroFondo = (await crearFondo(e)).id;
    const deOtroFondo = await valorDeDocumento(e, otroFondo, nota);
    expect(await hacerQue(deOtroFondo)).toBe('comprobantes_afectado_fk');
    expect(await hacerQue(valorDeDocumento(e, fondoId, { documentoAfectadoId: factura.id }))).toBe(
      'comprobantes_afectado_solo_en_notas',
    );
  });
});

describe('comprobantes: vale de gasto', () => {
  it('guarda un vale con su número, a quién se pagó, concepto y motivo', async () => {
    await expect(vale()).resolves.toMatchObject({ clase: 'vale_de_gasto', sobreElTope: false });
  });

  it('el número va solo en los vales, es positivo y no se repite por empresa y año', async () => {
    const primero = await vale();

    expect(await hacerQue(valeDeGastoValido(e, fondoId, { numero: null }))).toBe('comprobantes_numero_de_su_clase');
    expect(await hacerQue(valorDeDocumento(e, fondoId, { numero: 1 }))).toBe('comprobantes_numero_de_su_clase');
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { numero: 0 }))).toBe('comprobantes_numero_positivo');
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { numero: primero.numero }))).toBe('comprobantes_numero_unico');
    await expect(vale({ numero: primero.numero, anioDeNumero: 2026 })).resolves.toBeDefined();
  });

  it('la descripción, a quién se pagó y el motivo son obligatorios en el vale y van recortados', async () => {
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { descripcion: null }))).toBe(
      'comprobantes_descripcion_obligatoria',
    );
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { descripcion: ' Taxi ' }))).toBe(
      'comprobantes_descripcion_valida',
    );
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { pagadoA: null }))).toBe('comprobantes_pagado_a_de_su_clase');
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { pagadoA: 'x'.repeat(151) }))).toBe(
      'comprobantes_pagado_a_valido',
    );
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { motivoSinDocumento: null }))).toBe(
      'comprobantes_motivo_sin_documento_de_su_clase',
    );
    expect(await hacerQue(valorDeDocumento(e, fondoId, { motivoSinDocumento: 'No hubo' }))).toBe(
      'comprobantes_motivo_sin_documento_de_su_clase',
    );
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { motivoSinDocumento: '' }))).toBe(
      'comprobantes_motivo_sin_documento_rango',
    );
  });

  it('el concepto de gasto es obligatorio en el vale y de la misma empresa (llave compuesta)', async () => {
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { conceptoDeGastoId: null }))).toBe(
      'comprobantes_concepto_del_vale',
    );
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { conceptoDeGastoId: e.conceptoDeGastoA2 }))).toBe(
      'comprobantes_concepto_de_gasto_fk',
    );
  });

  it('la clase es una de las cuatro', async () => {
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { clase: 'otra' as never }))).toBe('comprobantes_clase_valida');
  });
});
