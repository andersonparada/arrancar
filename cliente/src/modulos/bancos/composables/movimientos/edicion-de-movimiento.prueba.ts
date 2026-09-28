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
const movimiento: Movimiento = { id: 'registro-1', ...datos, cuentaBancariaNombre: null };

describe('ventana de movimientos', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeMovimiento(edicionDe(movimiento))).toEqual(datos);
    expect(edicionDe(movimiento).id).toBe(movimiento.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeMovimiento(edicionDe())).toMatchObject({ referencia: null, beneficiario: null, observaciones: null });
  });
});
