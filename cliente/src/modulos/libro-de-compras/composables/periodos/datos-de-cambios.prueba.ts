import { describe, expect, it } from 'vitest';
import {
  esDinero,
  etiquetaDeCifra,
  nombreDelDocumentoCambiado,
  ordenarCambios,
  sentidoDelCambio,
} from './datos-de-cambios';

describe('etiquetaDeCifra', () => {
  it('nombra las cifras conocidas del libro', () => {
    expect(etiquetaDeCifra('documentos')).toBe('Documentos en el libro');
    expect(etiquetaDeCifra('resumen.creditoFiscalDelPeriodo')).toBe('Crédito fiscal del período');
    expect(etiquetaDeCifra('resumen.totales.ivaConCredito')).toBe('Libro: IVA con crédito');
    expect(etiquetaDeCifra('resumen.porTipoDte[FACT].cantidad')).toBe('Factura: cantidad');
    expect(etiquetaDeCifra('resumen.ivaSinCreditoPorMotivo[fuera_de_plazo].ivaSinCredito')).toBe(
      'IVA sin crédito: Fuera de plazo',
    );
    expect(etiquetaDeCifra('resumen.combustibles.idp')).toBe('Combustibles: IDP');
  });

  it('deja la clave tal cual si no la conoce', () => {
    expect(etiquetaDeCifra('resumen.algoNuevo')).toBe('resumen.algoNuevo');
  });
});

describe('cambios', () => {
  it('distingue dinero de conteos', () => {
    expect(esDinero('12.50')).toBe(true);
    expect(esDinero('3')).toBe(false);
  });

  it('marca si el cambio sube, baja o no cambia', () => {
    expect(sentidoDelCambio('1.00')).toBe('sube');
    expect(sentidoDelCambio('-0.01')).toBe('baja');
    expect(sentidoDelCambio('0.00')).toBe('igual');
  });

  it('pone primero el conteo y los totales', () => {
    const cambio = (clave: string) => ({ clave, anterior: '1', actual: '2', cambio: '1' });
    const claves = ordenarCambios([cambio('resumen.combustibles.idp'), cambio('documentos')]).map((c) => c.clave);
    expect(claves).toEqual(['documentos', 'resumen.combustibles.idp']);
  });

  it('nombra el documento con lo que tenga', () => {
    const base = { documentoId: 'x', cambio: 'anulado' as const, total: '1.00' };
    expect(nombreDelDocumentoCambiado({ ...base, tipoDte: 'FACT', serie: 'A', numero: '9' })).toBe('FACT A 9');
    expect(nombreDelDocumentoCambiado({ ...base, tipoDte: null, serie: null, numero: '9' })).toBe('9');
  });
});
