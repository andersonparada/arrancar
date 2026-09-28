import { describe, expect, it } from 'vitest';
import type { DatosMovimiento, Movimiento } from '../../servicios/movimientos.api';
import { datosDeMovimiento, edicionDe } from './edicion-de-movimiento';

const datos: DatosMovimiento = {
  cuentaBancariaId: '00000000-0000-4000-8000-000000000001',
  tipo: 'credito',
  fecha: '2026-01-15',
  monto: '12.50',
  saldoInicial: false,
  referencia: 'Registro de prueba',
  beneficiario: 'Registro de prueba',
  observaciones: 'Una nota de prueba.',
};
const movimiento: Movimiento = {
  id: 'registro-1',
  ...datos,
  cuentaBancariaNombre: null,
  anuladoEn: null,
  motivoDeAnulacion: null,
  transferenciaId: null,
  chequeId: null,
  numeroDeCheque: null,
  conciliacionId: null,
};

describe('ventana de movimientos', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeMovimiento(edicionDe(movimiento))).toEqual(datos);
    expect(edicionDe(movimiento).id).toBe(movimiento.id);
  });

  it('un registro nuevo empieza sin id, con el tipo elegido en el encabezado', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null, tipo: 'credito' });
    expect(edicionDe(undefined, 'debito')).toMatchObject({ abierta: true, id: null, tipo: 'debito' });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeMovimiento(edicionDe())).toMatchObject({ referencia: null, beneficiario: null, observaciones: null });
  });
});
