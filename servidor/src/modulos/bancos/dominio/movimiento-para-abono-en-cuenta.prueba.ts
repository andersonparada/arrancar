import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { AbonoEnCuentaSoloEnCheque } from './errores-de-impresion.js';
import { Movimiento, type DatosDeMovimiento } from './movimiento.js';

const empresaId = Identificador.desde<'Empresa'>('00000000-0000-4000-8000-0000000000aa');

const datos = (tipo: DatosDeMovimiento['tipo']): DatosDeMovimiento => ({
  cuentaBancariaId: '00000000-0000-4000-8000-000000000001',
  tipo,
  fecha: '2026-01-15',
  monto: '100.00',
  saldoInicial: false,
  referencia: null,
  beneficiario: 'Proveedor',
  observaciones: null,
  conceptoId: 'concepto-general',
});

describe('«Para abono en cuenta» del movimiento', () => {
  it('queda apagada por omisión', () => {
    expect(Movimiento.crear(empresaId, datos('cheque')).instantanea().paraAbonoEnCuenta).toBe(false);
  });

  it('un cheque puede llevarla, y se enciende y apaga mientras esté vigente', () => {
    const cheque = Movimiento.crear(empresaId, datos('cheque'), { paraAbonoEnCuenta: true });
    expect(cheque.instantanea().paraAbonoEnCuenta).toBe(true);

    cheque.cambiarParaAbonoEnCuenta(false);

    expect(cheque.instantanea().paraAbonoEnCuenta).toBe(false);
  });

  it('una nota de débito o de crédito no puede llevarla', () => {
    for (const tipo of ['debito', 'credito'] as const) {
      expect(() => Movimiento.crear(empresaId, datos(tipo), { paraAbonoEnCuenta: true })).toThrow(
        AbonoEnCuentaSoloEnCheque,
      );
      const nota = Movimiento.crear(empresaId, datos(tipo));
      expect(() => nota.cambiarParaAbonoEnCuenta(true)).toThrow(AbonoEnCuentaSoloEnCheque);
    }
  });
});
