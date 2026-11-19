import { describe, expect, it } from 'vitest';
import type { ChequeParaImprimir, VistaDeImpresion } from '../../servicios/tipos-de-impresion-de-cheques';
import {
  avisosDeLaVista,
  comprobanteVaAparte,
  idsDeLaVista,
  parteInicial,
  partesDeLaVista,
  reglaDePaginaDe,
  rotuloDeLaHoja,
  situacionDeLaImpresion,
  textoDeImprimir,
  tituloDelDocumento,
} from './armado-de-la-impresion';

const papelDelCheque = { anchoMm: 175, altoMm: 76 };

function cheque(numero: number, cambios: Partial<ChequeParaImprimir> = {}): ChequeParaImprimir {
  return {
    chequeId: `c${numero}`,
    numero,
    serie: null,
    impreso: false,
    cheque: {
      papel: papelDelCheque,
      desplazamiento: { xMm: 0, yMm: 0 },
      letra: { familia: 'monoespaciada', tamanoPt: 10 },
      campos: [],
      avisos: [],
    },
    comprobante: {} as ChequeParaImprimir['comprobante'],
    zonaDelComprobante: null,
    avisos: [],
    ...cambios,
  };
}

const vista = (cheques: ChequeParaImprimir[], avisos: string[] = []): VistaDeImpresion => ({
  cheques,
  avisos,
  loteId: null,
});

describe('partes de la vista', () => {
  it('un cheque suelto lleva su hoja y su comprobante en carta aparte', () => {
    const suelto = vista([cheque(1)]);
    expect(partesDeLaVista(suelto)).toEqual({ cheques: 1, comprobantes: 1 });
    expect(parteInicial(suelto)).toBe('cheques');
  });

  it('un voucher lleva el comprobante dentro de su hoja: no hay hoja carta aparte', () => {
    const voucher = vista([cheque(1, { zonaDelComprobante: { yMm: 100, altoMm: 170 } })]);
    expect(partesDeLaVista(voucher)).toEqual({ cheques: 1, comprobantes: 0 });
    expect(comprobanteVaAparte(voucher.cheques[0]!)).toBe(false);
  });

  it('reimprimir solo el comprobante: no hay hoja del cheque y se empieza por el comprobante', () => {
    const soloComprobante = vista([cheque(1, { cheque: null, impreso: true })]);
    expect(partesDeLaVista(soloComprobante)).toEqual({ cheques: 0, comprobantes: 1 });
    expect(parteInicial(soloComprobante)).toBe('comprobantes');
  });
});

describe('reglaDePaginaDe', () => {
  it('los cheques salen en el papel del formato, sin márgenes', () => {
    expect(reglaDePaginaDe(vista([cheque(1)]), 'cheques')).toBe('@page { size: 175mm 76mm; margin: 0; }');
  });

  it('los comprobantes salen en carta con margen', () => {
    expect(reglaDePaginaDe(vista([cheque(1)]), 'comprobantes')).toBe('@page { size: 215.9mm 279.4mm; margin: 12mm; }');
  });

  it('sin hoja de cheque no hay regla para los cheques', () => {
    expect(reglaDePaginaDe(vista([cheque(1, { cheque: null })]), 'cheques')).toBe('');
  });
});

describe('avisosDeLaVista', () => {
  it('junta los del lote y los de cada cheque sin repetir', () => {
    const lote = vista(
      [cheque(1, { avisos: ['Sin probar', 'Ya trae NO NEGOCIABLE'] }), cheque(4, { avisos: ['Sin probar'] })],
      ['Entre el 1 y el 4 faltan los cheques 2 a 3'],
    );
    expect(avisosDeLaVista(lote)).toEqual([
      'Entre el 1 y el 4 faltan los cheques 2 a 3',
      'Sin probar',
      'Ya trae NO NEGOCIABLE',
    ]);
  });
});

describe('situacionDeLaImpresion', () => {
  it('con algún cheque sin imprimir, imprimir lo registra', () => {
    expect(situacionDeLaImpresion(vista([cheque(1)]), false)).toBe('por-registrar');
  });

  it('después de registrarla aquí se puede volver a mandar a la impresora', () => {
    expect(situacionDeLaImpresion(vista([cheque(1, { impreso: true })]), true)).toBe('registrada');
  });

  it('un cheque ya impreso que se abre de nuevo no se imprime sin motivo: hay que reimprimir', () => {
    expect(situacionDeLaImpresion(vista([cheque(1, { impreso: true })]), false)).toBe('ya-impresa');
  });
});

describe('títulos y textos', () => {
  it('el título del documento dice el cheque o el rango', () => {
    expect(tituloDelDocumento(vista([cheque(1234)]))).toBe('Cheque 1234');
    expect(tituloDelDocumento(vista([cheque(1, { serie: 'A' }), cheque(2, { serie: 'A' })]))).toBe('Cheques A1 a A2');
    expect(tituloDelDocumento(vista([]))).toBe('Cheques');
  });

  it('el rótulo de cada hoja', () => {
    expect(rotuloDeLaHoja(cheque(5), 'cheques')).toBe('Cheque 5');
    expect(rotuloDeLaHoja(cheque(5), 'comprobantes')).toBe('Comprobante del cheque 5');
  });

  it('el botón dice qué se imprime cuando hay dos partes', () => {
    expect(textoDeImprimir('cheques', 3, true)).toBe('Imprimir los cheques (3)');
    expect(textoDeImprimir('comprobantes', 1, true)).toBe('Imprimir los comprobantes en hoja carta');
    expect(textoDeImprimir('cheques', 1, false)).toBe('Imprimir');
    expect(textoDeImprimir('cheques', 4, false)).toBe('Imprimir (4 hojas)');
  });

  it('manda los ids en el orden de la vista', () => {
    expect(idsDeLaVista(vista([cheque(1), cheque(2)]))).toEqual(['c1', 'c2']);
  });
});
