import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { MovimientoSinNumero } from './errores.js';
import { Movimiento, type DatosDeMovimiento } from './movimiento.js';
import { Transferencia } from './transferencia.js';

const empresaId = Identificador.desde<'Empresa'>('00000000-0000-4000-8000-0000000000aa');

const datos = (cambios: Partial<DatosDeMovimiento> = {}): DatosDeMovimiento => ({
  cuentaBancariaId: '00000000-0000-4000-8000-000000000001',
  tipo: 'credito',
  fecha: '2026-01-15',
  monto: '100.00',
  saldoInicial: false,
  referencia: null,
  beneficiario: null,
  observaciones: null,
  ...cambios,
});

describe('Movimiento.llevaNumero', () => {
  it('una nota suelta lleva número', () => {
    expect(Movimiento.crear(empresaId, datos()).llevaNumero).toBe(true);
    expect(Movimiento.crear(empresaId, datos({ tipo: 'debito' })).llevaNumero).toBe(true);
  });

  it('el saldo inicial, el cheque y la nota de una transferencia no llevan número', () => {
    const saldoInicial = Movimiento.crear(empresaId, datos({ saldoInicial: true }));
    const cheque = Movimiento.crear(empresaId, datos({ tipo: 'cheque' }));
    const deTransferencia = Movimiento.crear(empresaId, datos(), { transferenciaId: 'una-transferencia' });

    expect([saldoInicial, cheque, deTransferencia].map((m) => m.llevaNumero)).toEqual([false, false, false]);
  });

  it('el inverso de una nota suelta lleva número', () => {
    const inverso = Movimiento.crear(empresaId, datos()).revertir('2026-01-20', 'Error');

    expect(inverso.llevaNumero).toBe(true);
  });
});

describe('Movimiento.numerar', () => {
  it('guarda el número y el año', () => {
    const nota = Movimiento.crear(empresaId, datos());

    nota.numerar({ numero: 7, anio: 2026 });

    expect(nota.instantanea()).toMatchObject({ numero: 7, anioDeNumero: 2026 });
  });

  it('nace sin número', () => {
    expect(Movimiento.crear(empresaId, datos()).instantanea()).toMatchObject({ numero: null, anioDeNumero: 0 });
  });

  it('un movimiento que no lleva número lo rechaza', () => {
    const cheque = Movimiento.crear(empresaId, datos({ tipo: 'cheque' }));

    expect(() => cheque.numerar({ numero: 1, anio: 0 })).toThrow(MovimientoSinNumero);
  });
});

describe('Transferencia.numerar', () => {
  it('guarda el número y el año', () => {
    const transferencia = Transferencia.crear(empresaId, {
      cuentaOrigenId: '00000000-0000-4000-8000-000000000001',
      cuentaDestinoId: '00000000-0000-4000-8000-000000000002',
      fecha: '2026-01-15',
      monto: '100.00',
      referencia: null,
      observaciones: null,
    });
    expect(transferencia.instantanea().numero).toBeNull();

    transferencia.numerar({ numero: 3, anio: 0 });

    expect(transferencia.instantanea()).toMatchObject({ numero: 3, anioDeNumero: 0 });
  });
});
