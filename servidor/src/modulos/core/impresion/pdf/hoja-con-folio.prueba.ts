import { describe, expect, it } from 'vitest';
import { dibujarPieDeHoja, dibujarSelloDeFolio, hojaConFolio } from './hoja-con-folio.js';
import type { PincelDelPdf } from './pincel-del-pdf.js';

function pincelDoble() {
  const llamadas: unknown[][] = [];
  const pincel = { texto: (...args: unknown[]) => llamadas.push(args) } as unknown as PincelDelPdf;
  return { pincel, llamadas };
}

describe('hoja con folio', () => {
  it('el folio de cada hoja sigue al primero; sin primer folio es un borrador', () => {
    expect(hojaConFolio(2, 5, 40)).toEqual({ numero: 3, total: 5, folio: 42 });
    expect(hojaConFolio(0, 2, null)).toEqual({ numero: 1, total: 2, folio: null });
  });

  it('el sello dice «Folio N» en negro o «BORRADOR — sin folio» en rojo, arriba a la derecha', () => {
    const emitida = pincelDoble();
    dibujarSelloDeFolio(emitida.pincel, hojaConFolio(1, 3, 10));
    const borrador = pincelDoble();
    dibujarSelloDeFolio(borrador.pincel, hojaConFolio(1, 3, null));

    expect(emitida.llamadas[0]).toEqual([
      'Folio 11',
      { x: 656, y: 30, ancho: 250 },
      { tamano: 13, negrita: true, alinear: 'right', color: '#000000' },
    ]);
    expect(borrador.llamadas[0]?.[0]).toBe('BORRADOR — sin folio');
    expect(borrador.llamadas[0]?.[2]).toMatchObject({ color: '#B00020' });
  });

  it('el pie dice «Hoja N de M de este libro» centrado abajo', () => {
    const { pincel, llamadas } = pincelDoble();
    dibujarPieDeHoja(pincel, hojaConFolio(1, 3, 1));
    expect(llamadas[0]).toEqual([
      'Hoja 2 de 3 de este libro',
      { x: 30, y: 584, ancho: 876 },
      { tamano: 7, alinear: 'center', color: '#444444' },
    ]);
  });
});
