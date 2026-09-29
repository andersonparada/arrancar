import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import {
  NoSeReclasificaElSaldoInicial,
  NoSeReclasificaUnInverso,
  NoSeReclasificaUnaTransferencia,
} from './errores-de-conceptos.js';
import { Movimiento, type DatosDeMovimiento } from './movimiento.js';

const empresaId = Identificador.desde<'Empresa'>('00000000-0000-4000-8000-0000000000aa');

const datos = (cambios: Partial<DatosDeMovimiento> = {}): DatosDeMovimiento => ({
  cuentaBancariaId: '00000000-0000-4000-8000-000000000001',
  tipo: 'debito',
  fecha: '2026-01-15',
  monto: '100.00',
  saldoInicial: false,
  referencia: null,
  beneficiario: null,
  observaciones: null,
  conceptoId: 'concepto-de-comisiones',
  ...cambios,
});

const nota = (cambios: Partial<DatosDeMovimiento> = {}) => Movimiento.crear(empresaId, datos(cambios));

describe('el concepto de un movimiento', () => {
  it('el inverso hereda el concepto de su original', () => {
    const inverso = nota().revertir('2026-01-20', 'Error');

    expect(inverso.instantanea().conceptoId).toBe('concepto-de-comisiones');
  });

  it('el inverso de un cheque hereda su concepto, aunque sea de débito y el inverso sea un crédito', () => {
    const inverso = nota({ tipo: 'cheque' }).revertirPorCheque('2026-01-20', 'Nunca se cobró');

    expect(inverso.instantanea()).toMatchObject({ tipo: 'credito', conceptoId: 'concepto-de-comisiones' });
  });

  it('reclasificar cambia solo el concepto y devuelve el anterior', () => {
    const original = nota();
    const antes = original.instantanea();

    const anterior = original.reclasificar('concepto-de-planilla');

    expect(anterior).toBe('concepto-de-comisiones');
    expect(original.instantanea()).toEqual({ ...antes, conceptoId: 'concepto-de-planilla' });
  });

  it('reclasificar un original ya revertido es válido y su inverso lo sigue', () => {
    const original = nota();
    const inverso = original.revertir('2026-01-20', 'Error');

    original.reclasificar('concepto-de-planilla');
    inverso.seguirAlOriginal('concepto-de-planilla');

    expect(original.instantanea().conceptoId).toBe('concepto-de-planilla');
    expect(inverso.instantanea().conceptoId).toBe('concepto-de-planilla');
  });

  it('un inverso, una nota de transferencia y el saldo inicial no se reclasifican', () => {
    const inverso = nota().revertir('2026-01-20', 'Error');
    const deTransferencia = Movimiento.crear(empresaId, datos(), { transferenciaId: 'una-transferencia' });

    expect(() => inverso.reclasificar('otro')).toThrow(NoSeReclasificaUnInverso);
    expect(() => deTransferencia.reclasificar('otro')).toThrow(NoSeReclasificaUnaTransferencia);
    expect(() => nota({ saldoInicial: true, tipo: 'credito' }).reclasificar('otro')).toThrow(
      NoSeReclasificaElSaldoInicial,
    );
  });
});
