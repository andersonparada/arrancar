import { describe, expect, it } from 'vitest';
import { datosDeChequera, edicionDeChequera } from './edicion-de-chequera';

describe('ventana de chequeras', () => {
  it('empieza vacía y abierta', () => {
    expect(edicionDeChequera()).toMatchObject({ abierta: true, serie: '', desde: '', hasta: '' });
  });

  it('la serie en blanco se manda como null', () => {
    expect(datosDeChequera({ ...edicionDeChequera(), serie: '   ', desde: 1, hasta: 50 })).toEqual({
      serie: null,
      desde: 1,
      hasta: 50,
    });
  });

  it('manda lo que se llenó, con los números como números', () => {
    expect(datosDeChequera({ ...edicionDeChequera(), serie: 'A', desde: '1', hasta: '50' })).toEqual({
      serie: 'A',
      desde: 1,
      hasta: 50,
    });
  });
});
