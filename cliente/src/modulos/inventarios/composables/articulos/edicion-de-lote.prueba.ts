import { describe, expect, it } from 'vitest';
import { datosDeLote, edicionDeLoteNuevo } from './edicion-de-lote';

describe('ventana de lotes', () => {
  it('abre vacía', () => {
    expect(edicionDeLoteNuevo()).toEqual({
      abierta: true,
      codigo: '',
      fechaDeVencimiento: '',
      fechaDeFabricacion: '',
      observaciones: '',
    });
  });

  it('lo que no se llena se manda como null', () => {
    const edicion = { ...edicionDeLoteNuevo(), codigo: 'L-2026-01', fechaDeVencimiento: '2027-01-31' };

    expect(datosDeLote(edicion)).toEqual({
      codigo: 'L-2026-01',
      fechaDeVencimiento: '2027-01-31',
      fechaDeFabricacion: null,
      observaciones: null,
    });
  });
});
