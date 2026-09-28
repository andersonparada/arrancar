import { describe, expect, it } from 'vitest';
import { datosDeTransferencia, edicionDe } from './edicion-de-transferencia';

describe('ventana de transferencias', () => {
  it('empieza vacía y abierta', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, cuentaOrigenId: null, cuentaDestinoId: null });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeTransferencia(edicionDe())).toMatchObject({
      cuentaOrigenId: '',
      cuentaDestinoId: '',
      referencia: null,
      observaciones: null,
    });
  });

  it('manda lo que se llenó', () => {
    const edicion = {
      ...edicionDe(),
      cuentaOrigenId: 'cuenta-1',
      cuentaDestinoId: 'cuenta-2',
      fecha: '2026-01-15',
      monto: '250.00',
      referencia: 'Boleta 9',
      observaciones: 'Una nota.',
    };

    expect(datosDeTransferencia(edicion)).toEqual({
      cuentaOrigenId: 'cuenta-1',
      cuentaDestinoId: 'cuenta-2',
      fecha: '2026-01-15',
      monto: '250.00',
      referencia: 'Boleta 9',
      observaciones: 'Una nota.',
    });
  });
});
