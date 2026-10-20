/**
 * Prueba de integración contra PostgreSQL: el motivo `recibo_fel` (RECI y RDON al NIT de la empresa, fuera del libro)
 * y la factura especial sin otros impuestos ni IDP.
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

/** Un recibo FEL a la empresa: fuera del libro, sin IVA, con su código y su autorización. */
const reciboFel = (cambios: Record<string, unknown> = {}) => ({
  tipo: 'recibo',
  tipoDte: 'RECI',
  muestraEnReportesSat: false,
  motivoFueraDelLibro: 'recibo_fel',
  autorizacionFel: crypto.randomUUID(),
  nitReceptor: '7654321',
  nitEmisor: null,
  serie: null,
  iva: '0',
  base: '112',
  motivoSinCredito: null,
  ...cambios,
});

beforeAll(async () => {
  e = await prepararEscenario('documentosrecibofel');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('documentos: recibo FEL a la empresa', () => {
  it('RECI y RDON con autorización quedan fuera del libro', async () => {
    await expect(crear(reciboFel())).resolves.toBeTruthy();
    await expect(crear(reciboFel({ tipoDte: 'RDON' }))).resolves.toBeTruthy();
  });

  it('exige la autorización FEL', async () => {
    const sinAutorizacion = reciboFel({ autorizacionFel: null, tipoDte: null });

    expect(await restriccionDe(sinAutorizacion)).toBe('documentos_fel_con_autorizacion');
  });

  it('solo vale para la familia recibo con su código', async () => {
    expect(await restriccionDe(reciboFel({ tipo: 'factura', tipoDte: 'FACT' }))).toBe(
      'documentos_recibo_fel_de_la_familia',
    );
    expect(await restriccionDe(reciboFel({ tipoDte: null }))).toBe('documentos_tipo_dte_con_fel');
  });

  it('la casilla SAT sigue al motivo: con el motivo no puede ir marcada', async () => {
    expect(await restriccionDe(reciboFel({ muestraEnReportesSat: true, nitEmisor: '1234567', serie: 'A' }))).toBe(
      'documentos_muestra_segun_motivo',
    );
  });

  it('un motivo que no existe se rechaza', async () => {
    expect(await restriccionDe(reciboFel({ motivoFueraDelLibro: 'recibo' }))).toBe(
      'documentos_motivo_fuera_del_libro_valido',
    );
  });
});

describe('documentos: factura especial sin otros impuestos ni IDP', () => {
  const especial = (cambios: Record<string, unknown> = {}) => ({
    tipo: 'factura_especial',
    nitReceptor: '7654321',
    ...cambios,
  });

  it('con otros impuestos o con IDP se rechaza', async () => {
    const conOtros = especial({ otrosImpuestos: '10', base: '90' });
    const conIdp = especial({ idp: '10', base: '90' });

    expect(await restriccionDe(conOtros)).toBe('documentos_factura_especial_sin_otros');
    expect(await restriccionDe(conIdp)).toBe('documentos_factura_especial_sin_otros');
  });

  it('sin ellos pasa, y una factura común sí admite otros impuestos', async () => {
    await expect(crear(especial())).resolves.toBeTruthy();
    await expect(crear({ otrosImpuestos: '10', base: '90' })).resolves.toBeTruthy();
  });
});
