import { describe, expect, it } from 'vitest';
import {
  conceptoDeAjuste,
  conceptoDeLasLineas,
  esDeducible,
  firmadoDelComprobante,
  motivoSinDocumentoFiscal,
  SIN_CONCEPTO,
  VARIOS_CONCEPTOS,
} from './reglas-de-reportes.js';

const documento = (enElLibro: boolean, motivoFueraDelLibro: string | null = null) => ({
  tipo: 'FACT',
  serie: null,
  numero: '1',
  proveedorNombre: 'Proveedor',
  fechaEmision: '2026-10-01',
  totalCentavos: 100,
  enElLibro,
  motivoFueraDelLibro,
});

describe('esDeducible', () => {
  it('solo lo es un documento dentro del libro', () => {
    expect(esDeducible({ clase: 'documento', documento: documento(true) })).toBe(true);
    expect(esDeducible({ clase: 'documento', documento: documento(false) })).toBe(false);
    expect(esDeducible({ clase: 'vale_de_gasto', documento: null })).toBe(false);
    expect(esDeducible({ clase: 'faltante', documento: null })).toBe(false);
  });
});

describe('firmadoDelComprobante', () => {
  it('resta las notas de crédito y los sobrantes', () => {
    expect(firmadoDelComprobante({ montoCentavos: 500, resta: false })).toBe(500);
    expect(firmadoDelComprobante({ montoCentavos: 500, resta: true })).toBe(-500);
  });
});

describe('conceptoDeLasLineas', () => {
  it('da el concepto único, «Varios conceptos» o «Sin concepto»', () => {
    expect(conceptoDeLasLineas(['Medicinas', 'Medicinas'])).toBe('Medicinas');
    expect(conceptoDeLasLineas(['Medicinas', 'Combustible'])).toBe(VARIOS_CONCEPTOS);
    expect(conceptoDeLasLineas([])).toBe(SIN_CONCEPTO);
  });
});

describe('conceptoDeAjuste', () => {
  it('nombra el faltante y el sobrante, y deja los demás a su documento o vale', () => {
    expect(conceptoDeAjuste('faltante')).toBe('Faltante de arqueo');
    expect(conceptoDeAjuste('sobrante')).toBe('Sobrante de arqueo');
    expect(conceptoDeAjuste('documento')).toBeNull();
  });
});

describe('motivoSinDocumentoFiscal', () => {
  it('toma el motivo del vale o la causa de quedar fuera del libro', () => {
    const vale = { clase: 'vale_de_gasto' as const, documento: null, motivoSinDocumento: 'El peaje no da factura' };
    expect(motivoSinDocumentoFiscal(vale)).toBe('El peaje no da factura');
    const fuera = { clase: 'documento' as const, documento: documento(false, 'recibo_fel'), motivoSinDocumento: null };
    expect(motivoSinDocumentoFiscal(fuera)).toBe('Es un recibo FEL');
  });
});
