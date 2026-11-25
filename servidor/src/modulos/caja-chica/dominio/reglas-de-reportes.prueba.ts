import { describe, expect, it } from 'vitest';
import { SEGUIMIENTO_POR_RESOLVER, type SeguimientoDelDocumento } from './documento-anulado.js';
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

const vigente = { motivoDocumentoAnulado: null, seguimiento: null };
const anulado = (seguimiento: SeguimientoDelDocumento) => ({
  motivoDocumentoAnulado: 'El emisor anuló la FEL',
  seguimiento,
});

describe('esDeducible', () => {
  it('solo lo es un documento dentro del libro', () => {
    expect(esDeducible({ ...vigente, clase: 'documento', documento: documento(true) })).toBe(true);
    expect(esDeducible({ ...vigente, clase: 'documento', documento: documento(false) })).toBe(false);
    expect(esDeducible({ ...vigente, clase: 'vale_de_gasto', documento: null })).toBe(false);
    expect(esDeducible({ ...vigente, clase: 'faltante', documento: null })).toBe(false);
  });

  it('un documento con la FEL anulada por su emisor no lo es, esté dentro del libro o no, hasta que lo reemplace otra', () => {
    for (const situacion of [
      SEGUIMIENTO_POR_RESOLVER,
      { ...SEGUIMIENTO_POR_RESOLVER, situacion: 'en_disputa' as const },
    ]) {
      const comprobante = { ...anulado(situacion), clase: 'documento' as const, documento: documento(true) };
      expect(esDeducible(comprobante)).toBe(false);
    }
    const sinRecuperar = {
      ...SEGUIMIENTO_POR_RESOLVER,
      situacion: 'resuelto' as const,
      salida: 'sin_recuperacion' as const,
    };
    expect(esDeducible({ ...anulado(sinRecuperar), clase: 'documento', documento: documento(true) })).toBe(false);
    const reemplazado = { ...SEGUIMIENTO_POR_RESOLVER, situacion: 'resuelto' as const, salida: 'reemplazo' as const };
    expect(esDeducible({ ...anulado(reemplazado), clase: 'documento', documento: documento(true) })).toBe(true);
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
    const vale = {
      ...vigente,
      clase: 'vale_de_gasto' as const,
      documento: null,
      motivoSinDocumento: 'El peaje no da factura',
    };
    expect(motivoSinDocumentoFiscal(vale)).toBe('El peaje no da factura');
    const fuera = {
      ...vigente,
      clase: 'documento' as const,
      documento: documento(false, 'recibo_fel'),
      motivoSinDocumento: null,
    };
    expect(motivoSinDocumentoFiscal(fuera)).toBe('Es un recibo FEL');
  });

  it('con la FEL anulada por su emisor dice eso y el motivo del aviso', () => {
    const anuladoPorElEmisor = {
      ...anulado(SEGUIMIENTO_POR_RESOLVER),
      clase: 'documento' as const,
      documento: documento(true),
      motivoSinDocumento: null,
    };
    expect(motivoSinDocumentoFiscal(anuladoPorElEmisor)).toBe(
      'La FEL fue anulada por su emisor: El emisor anuló la FEL',
    );
  });
});
