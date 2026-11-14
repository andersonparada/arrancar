import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { MovimientoDeOtroModulo, NotaNoMarcable } from './errores-de-origen.js';
import { Movimiento, type DatosDeMovimiento } from './movimiento.js';

const empresaId = Identificador.desde<'Empresa'>('00000000-0000-4000-8000-0000000000aa');
const ORIGEN = { modulo: 'cuentas-por-pagar', documentoId: '00000000-0000-4000-8000-0000000000bb' };

const datos = (cambios: Partial<DatosDeMovimiento> = {}): DatosDeMovimiento => ({
  cuentaBancariaId: '00000000-0000-4000-8000-000000000001',
  tipo: 'debito',
  fecha: '2026-01-15',
  monto: '100.00',
  saldoInicial: false,
  referencia: 'Pago',
  beneficiario: 'Proveedor',
  observaciones: null,
  conceptoId: 'concepto-general',
  ...cambios,
});

const deOtroModulo = () => Movimiento.crear(empresaId, datos(), { origen: ORIGEN });

describe('un movimiento que generó otro módulo', () => {
  it('guarda su origen y no se corrige ni se elimina en Bancos', () => {
    const movimiento = deOtroModulo();

    expect(movimiento.instantanea()).toMatchObject({
      moduloDeOrigen: 'cuentas-por-pagar',
      documentoDeOrigenId: ORIGEN.documentoId,
    });
    expect(() => movimiento.corregir(datos({ monto: '90.00' }))).toThrow(MovimientoDeOtroModulo);
    expect(() => movimiento.exigirEliminable()).toThrow(MovimientoDeOtroModulo);
  });

  it('sí se anula (con inverso), y el inverso no hereda el origen', () => {
    const inverso = deOtroModulo().revertir('2026-01-20', 'Pago anulado');

    expect(inverso.instantanea()).toMatchObject({ moduloDeOrigen: null, documentoDeOrigenId: null });
  });

  it('fija su concepto por reparto; uno sin origen no', () => {
    const movimiento = deOtroModulo();

    movimiento.fijarConceptoDelReparto('concepto-de-activo');

    expect(movimiento.instantanea().conceptoId).toBe('concepto-de-activo');
    expect(() => Movimiento.crear(empresaId, datos()).fijarConceptoDelReparto('x')).toThrow(Error);
  });
});

describe('Movimiento.exigirNotaDeDebitoMarcable', () => {
  it('acepta una nota de débito suelta y vigente', () => {
    expect(() => Movimiento.crear(empresaId, datos()).exigirNotaDeDebitoMarcable()).not.toThrow();
  });

  it.each([
    ['una nota de crédito', () => Movimiento.crear(empresaId, datos({ tipo: 'credito' }))],
    ['un cheque', () => Movimiento.crear(empresaId, datos({ tipo: 'cheque' }))],
    ['el saldo inicial', () => Movimiento.crear(empresaId, datos({ saldoInicial: true }))],
    ['una nota de una transferencia', () => Movimiento.crear(empresaId, datos(), { transferenciaId: 'transferencia' })],
    ['lo de otro módulo', deOtroModulo],
    ['un inverso', () => Movimiento.crear(empresaId, datos(), { revierteAId: 'original' })],
    [
      'una nota ya revertida',
      () => {
        const nota = Movimiento.crear(empresaId, datos());
        nota.revertir('2026-01-20', 'Error');
        return nota;
      },
    ],
  ])('rechaza %s', (_nombre, armar) => {
    expect(() => armar().exigirNotaDeDebitoMarcable()).toThrow(NotaNoMarcable);
  });
});
