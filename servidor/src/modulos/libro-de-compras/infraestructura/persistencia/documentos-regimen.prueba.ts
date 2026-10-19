/**
 * Prueba de integración contra PostgreSQL: la foto del régimen de IVA que cada documento guarda y los `check`
 * que dependen de ella (motivo `empresa_sin_credito` obligatorio, solo en períodos sin crédito y sin art. 20).
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

/** Una factura de empresa sin crédito fiscal con su IVA entero al costo. */
const SIN_CREDITO = {
  regimenIvaDeLaEmpresa: 'no_afiliado',
  motivoSinCredito: 'empresa_sin_credito',
  ivaNoAcreditable: '12',
};
const NOTA = { tipo: 'nota_de_credito', fechaRecepcion: '2026-04-10', periodo: '2026-04-01' };

beforeAll(async () => {
  e = await prepararEscenario('documentosregimen');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('documentos: régimen de IVA de la empresa', () => {
  it('es obligatorio y solo acepta uno de los seis regímenes', async () => {
    const sinRegimen = await errorDePostgres(crear({ regimenIvaDeLaEmpresa: null }));

    expect(sinRegimen?.code).toBe('23502');
    expect(await restriccionDe({ regimenIvaDeLaEmpresa: 'otro', iva: '0', base: '112' })).toBe(
      'documentos_regimen_de_la_empresa_valido',
    );
  });

  it('un período sin crédito con IVA exige el motivo empresa_sin_credito', async () => {
    const sinMotivo = await restriccionDe({ regimenIvaDeLaEmpresa: 'pequeno_contribuyente' });

    expect(sinMotivo).toBe('documentos_empresa_sin_credito');
    await expect(crear(SIN_CREDITO)).resolves.toBeTruthy();
  });

  it('sin IVA, o fuera del libro, no hace falta el motivo', async () => {
    const sinIva = { regimenIvaDeLaEmpresa: 'no_afiliado', iva: '0', base: '112' };
    const fuera = { muestraEnReportesSat: false, motivoFueraDelLibro: 'sin_fel', nitEmisor: null, serie: null };

    await expect(crear(sinIva)).resolves.toBeTruthy();
    await expect(crear({ ...sinIva, ...fuera, autorizacionFel: null })).resolves.toBeTruthy();
  });

  it('el motivo empresa_sin_credito solo se acepta en un período sin crédito', async () => {
    const enGeneral = { ...SIN_CREDITO, regimenIvaDeLaEmpresa: 'general' };

    expect(await restriccionDe(enGeneral)).toBe('documentos_empresa_sin_credito_real');
  });

  it('la nota hereda empresa_sin_credito de su factura aunque su período dé crédito', async () => {
    const factura = await crear(SIN_CREDITO);
    const heredada = { ...NOTA, documentoAfectadoId: factura, motivoSinCredito: 'empresa_sin_credito' };

    await expect(crear({ ...heredada, ivaNoAcreditable: '12' })).resolves.toBeTruthy();
  });

  it('la nota de un período sin crédito con IVA también lleva el motivo', async () => {
    const factura = await crear();
    const nota = { ...NOTA, documentoAfectadoId: factura, regimenIvaDeLaEmpresa: 'no_afiliado' };

    expect(await restriccionDe(nota)).toBe('documentos_empresa_sin_credito');
    await expect(crear({ ...nota, ...SIN_CREDITO })).resolves.toBeTruthy();
  });

  it('en un período sin crédito no se aceptan fuera_de_plazo ni no_vinculado, salvo en la nota', async () => {
    // Sin IVA para que el único check que falle sea el del art. 20 (los demás los pasa el documento).
    const sinIva = { regimenIvaDeLaEmpresa: 'no_afiliado', iva: '0', base: '112', ivaNoAcreditable: '0' };
    const tarde = { fechaEmision: '2026-01-10', fechaRecepcion: '2026-06-10', periodo: '2026-06-01' };

    const fueraDePlazo = { ...sinIva, ...tarde, motivoSinCredito: 'fuera_de_plazo' };
    const noVinculado = { ...sinIva, motivoSinCredito: 'no_vinculado' };
    expect(await restriccionDe(fueraDePlazo)).toBe('documentos_sin_credito_sin_art_20');
    expect(await restriccionDe(noVinculado)).toBe('documentos_sin_credito_sin_art_20');
  });

  it('la nota sí puede heredar fuera_de_plazo de su factura aunque su período no dé crédito', async () => {
    const factura = await crear();
    const sinIva = { iva: '0', base: '112', ivaNoAcreditable: '0', regimenIvaDeLaEmpresa: 'no_afiliado' };

    await expect(
      crear({ ...NOTA, ...sinIva, documentoAfectadoId: factura, motivoSinCredito: 'fuera_de_plazo' }),
    ).resolves.toBeTruthy();
  });
});
