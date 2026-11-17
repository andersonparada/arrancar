import { describe, expect, it } from 'vitest';
import { DatoInvalido } from '../../../../core/compartido/dominio/errores.js';
import { conIndiceDelPago, enElPago } from './errores-por-pago.js';

class ConCampo extends DatoInvalido {
  readonly codigo = 'con_campo';

  constructor(campo?: string) {
    super('x', campo ? { campo } : undefined);
  }
}

describe('el índice del pago en los errores', () => {
  it('antepone pagos.<i> al campo y anota el pago', () => {
    const error = conIndiceDelPago(new ConCampo('aplicaciones.0.monto'), 2) as ConCampo;
    expect(error.detalles).toEqual({ campo: 'pagos.2.aplicaciones.0.monto', pago: 2 });
  });

  it('no repite el prefijo ni cambia un error que ya trae su pago', () => {
    const ya = conIndiceDelPago(new ConCampo('pagos.1.motivoSinBancarizar'), 1) as ConCampo;
    expect(ya.detalles).toEqual({ campo: 'pagos.1.motivoSinBancarizar', pago: 1 });
    expect((conIndiceDelPago(ya, 5) as ConCampo).detalles).toMatchObject({ pago: 1 });
  });

  it('un error sin campo solo recibe el pago, y lo que no es esperado pasa igual', async () => {
    expect((conIndiceDelPago(new ConCampo(), 0) as ConCampo).detalles).toEqual({ pago: 0 });
    const raro = new Error('fallo');
    await expect(enElPago(0, () => Promise.reject(raro))).rejects.toBe(raro);
  });
});
