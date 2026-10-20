/**
 * Prueba de integración contra PostgreSQL: la nota de débito del proveedor (NDEB) y los `check` que la tocan (código,
 * factura obligatoria, siempre en el libro, motivo propio, IVA cero donde la factura no lo cobra, plazos del art. 20
 * desde su propia emisión y el motivo `nota_de_debito_tardia`).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import {
  contextoDe,
  documentoValido,
  errorDePostgres,
  insertarDocumento,
  prepararEscenario,
  type Escenario,
} from './documentos.soporte.js';

let e: Escenario;

const crear = (cambios: Record<string, unknown> = {}) =>
  insertarDocumento(documentoValido(e, cambios), contextoDe(e, e.empresaA1, e.cuentaA));
const restriccionDe = async (cambios: Record<string, unknown>) => (await errorDePostgres(crear(cambios)))?.constraint;

/** Una nota de débito válida sobre `facturaId`: recibida un mes después de la factura de marzo, sin motivo. */
const ndeb = (facturaId: string | null, cambios: Record<string, unknown> = {}) => ({
  tipo: 'nota_de_debito',
  documentoAfectadoId: facturaId,
  fechaEmision: '2026-04-10',
  fechaRecepcion: '2026-04-12',
  periodo: '2026-04-01',
  ...cambios,
});
const SIN_IVA_PEQUENO = { motivoSinCredito: 'pequeno_contribuyente', iva: '0', base: '112' };
const AL_COSTO = { iva: '12', ivaNoAcreditable: '12' };

beforeAll(async () => {
  e = await prepararEscenario('documentosnotadedebito');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('documentos: nota de débito', () => {
  it('lleva NDEB y apunta a una factura; no se mezcla con otros códigos', async () => {
    const factura = await crear();

    await expect(crear(ndeb(factura))).resolves.toBeTruthy();
    expect(await restriccionDe(ndeb(factura, { tipoDte: 'NCRE' }))).toBe('documentos_tipo_dte_de_la_familia');
    expect(await restriccionDe(ndeb(factura, { tipoDte: 'FACT' }))).toBe('documentos_tipo_dte_de_la_familia');
    expect(await restriccionDe({ tipoDte: 'NDEB' })).toBe('documentos_tipo_dte_de_la_familia');
  });

  it('sin factura se rechaza, y la factura no puede ser de otro proveedor ni de otro destino', async () => {
    const factura = await crear();
    const deOtroProveedor = await crear({ proveedorId: e.proveedorA2 });
    const deOtroDestino = await crear({ destino: 'caja-chica' });

    expect(await restriccionDe(ndeb(null))).toBe('documentos_nota_con_factura');
    expect(await restriccionDe(ndeb(deOtroProveedor))).toBe('documentos_nota_factura_fk');
    expect(await restriccionDe(ndeb(deOtroDestino))).toBe('documentos_nota_factura_fk');
    expect(await restriccionDe({ documentoAfectadoId: factura })).toBe('documentos_nota_con_factura');
  });

  it('va siempre en el libro de reportes SAT', async () => {
    const factura = await crear();
    const fueraDelLibro = {
      muestraEnReportesSat: false,
      motivoFueraDelLibro: 'sin_fel',
      autorizacionFel: null,
      nitEmisor: null,
      serie: null,
      iva: '0',
      base: '112',
    };

    expect(await restriccionDe(ndeb(factura, fueraDelLibro))).toBe('documentos_nota_de_debito_en_el_libro');
  });

  it('se registra en el mes que se recibe, no en el de su emisión (no es nota de crédito)', async () => {
    const factura = await crear();

    await expect(crear(ndeb(factura, { periodo: '2026-04-01', fechaRecepcion: '2026-04-20' }))).resolves.toBeTruthy();
    await expect(crear(ndeb(factura, { periodo: '2026-05-01', fechaRecepcion: '2026-04-20' }))).resolves.toBeTruthy();
    expect(await restriccionDe(ndeb(factura, { periodo: '2026-03-01' }))).toBe('documentos_periodo_desde_emision');
  });
});

describe('documentos: nota de débito de una factura sin IVA', () => {
  it('hereda el motivo de la familia con IVA cero y nunca lleva IVA', async () => {
    const factura = await crear({ ...SIN_IVA_PEQUENO, tipo: 'factura_pequeno_contribuyente' });

    await expect(crear(ndeb(factura, SIN_IVA_PEQUENO))).resolves.toBeTruthy();
    expect(await restriccionDe(ndeb(factura, { ...SIN_IVA_PEQUENO, iva: '12', base: '100' }))).toBe(
      'documentos_motivo_sin_iva',
    );
  });

  it('la nota de crédito de esa factura tampoco lleva IVA (el hueco que no cubría `familia_sin_iva`)', async () => {
    const factura = await crear({ ...SIN_IVA_PEQUENO, tipo: 'factura_pequeno_contribuyente' });
    const credito = {
      tipo: 'nota_de_credito',
      documentoAfectadoId: factura,
      fechaRecepcion: '2026-04-12',
      periodo: '2026-04-01',
    };

    expect(await restriccionDe({ ...credito, ...SIN_IVA_PEQUENO, iva: '12', base: '100' })).toBe(
      'documentos_motivo_sin_iva',
    );
  });
});

describe('documentos: nota de débito y el plazo del crédito', () => {
  it('se le mide el art. 20 desde su propia emisión, no desde la de su factura', async () => {
    const factura = await crear();
    const tarde = ndeb(factura, { fechaEmision: '2026-04-10', fechaRecepcion: '2026-07-05', periodo: '2026-07-01' });

    expect(await restriccionDe(tarde)).toBe('documentos_plazo_del_credito');
    await expect(crear({ ...tarde, motivoSinCredito: 'fuera_de_plazo', ...AL_COSTO })).resolves.toBeTruthy();
    expect(await restriccionDe(ndeb(factura, { motivoSinCredito: 'fuera_de_plazo', ...AL_COSTO }))).toBe(
      'documentos_fuera_de_plazo_real',
    );
  });

  it('la nota de débito tardía (art. 17) lleva el IVA al costo y solo es de la nota de débito', async () => {
    const factura = await crear();
    const tardia = ndeb(factura, { motivoSinCredito: 'nota_de_debito_tardia', ...AL_COSTO });

    await expect(crear(tardia)).resolves.toBeTruthy();
    expect(await restriccionDe(ndeb(factura, { motivoSinCredito: 'nota_de_debito_tardia' }))).toBe(
      'documentos_iva_no_acreditable_por_motivo',
    );
    expect(await restriccionDe({ motivoSinCredito: 'nota_de_debito_tardia', ...AL_COSTO })).toBe(
      'documentos_nota_de_debito_tardia_solo_en_la_nota',
    );
  });

  it('sin crédito de IVA en el período, la nota de débito lleva `empresa_sin_credito` y no puede ser tardía', async () => {
    const factura = await crear();
    const sinCredito = { regimenIvaDeLaEmpresa: 'pequeno_contribuyente' };

    await expect(
      crear(ndeb(factura, { ...sinCredito, motivoSinCredito: 'empresa_sin_credito', ...AL_COSTO })),
    ).resolves.toBeTruthy();
    expect(
      await restriccionDe(
        ndeb(factura, { ...sinCredito, motivoSinCredito: 'nota_de_debito_tardia', iva: '0', base: '112' }),
      ),
    ).toBe('documentos_sin_credito_sin_art_20');
    expect(await restriccionDe(ndeb(factura, { motivoSinCredito: 'empresa_sin_credito', ...AL_COSTO }))).toBe(
      'documentos_empresa_sin_credito_real',
    );
  });
});
