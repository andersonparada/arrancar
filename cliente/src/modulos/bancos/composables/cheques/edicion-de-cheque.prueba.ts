import { describe, expect, it } from 'vitest';
import { datosDeEmisionDeCheque, edicionDeCheque } from './edicion-de-cheque';

describe('ventana de emisión de cheque', () => {
  it('empieza vacía, abierta y con "No negociable" marcado', () => {
    expect(edicionDeCheque()).toMatchObject({
      abierta: true,
      cuentaBancariaId: null,
      chequeId: null,
      conceptoId: null,
      noNegociable: true,
    });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeEmisionDeCheque(edicionDeCheque())).toMatchObject({ referencia: null, observaciones: null });
  });

  it('manda lo que se llenó, recortando el beneficiario', () => {
    const edicion = {
      ...edicionDeCheque(),
      fecha: '2026-02-01',
      monto: '150.00',
      beneficiario: '  Proveedor S.A.  ',
      conceptoId: 'concepto-1',
      noNegociable: false,
      referencia: 'Pago de servicios',
      observaciones: 'Una nota.',
    };

    expect(datosDeEmisionDeCheque(edicion)).toEqual({
      fecha: '2026-02-01',
      monto: '150.00',
      beneficiario: 'Proveedor S.A.',
      noNegociable: false,
      conceptoId: 'concepto-1',
      referencia: 'Pago de servicios',
      observaciones: 'Una nota.',
    });
  });
});
