import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import {
  FechaDeReversionAnterior,
  MotivoDeAnulacionInvalido,
  MovimientoAnulado,
  MovimientoDeCheque,
  MovimientoDeTransferencia,
  MovimientoMarcadoEnConciliacion,
  MovimientoYaRevertido,
  NoSeCorrigeUnInverso,
  NoSeEliminaUnInverso,
  NoSeEliminaUnMovimientoRevertido,
  NoSeRevierteUnInverso,
} from './errores.js';
import { Movimiento, type DatosDeMovimiento } from './movimiento.js';

const empresaId = Identificador.desde<'Empresa'>('00000000-0000-4000-8000-0000000000aa');

const datos = (cambios: Partial<DatosDeMovimiento> = {}): DatosDeMovimiento => ({
  cuentaBancariaId: '00000000-0000-4000-8000-000000000001',
  tipo: 'credito',
  fecha: '2026-01-15',
  monto: '100.00',
  saldoInicial: false,
  referencia: 'Boleta 123',
  beneficiario: 'Proveedor',
  observaciones: 'Una observación',
  ...cambios,
});

const nota = (cambios: Partial<DatosDeMovimiento> = {}) => Movimiento.crear(empresaId, datos(cambios));

describe('Movimiento.revertir (el inverso de una nota)', () => {
  it('una nota de crédito se revierte con una de débito, enlazada al original', () => {
    const original = nota();

    const inverso = original.revertir('2026-01-20', '  Boleta duplicada ');

    expect(inverso.instantanea()).toMatchObject({
      tipo: 'debito',
      fecha: '2026-01-20',
      monto: '100.00',
      cuentaBancariaId: original.instantanea().cuentaBancariaId,
      beneficiario: 'Proveedor',
      saldoInicial: false,
      revierteAId: original.id.valor,
      revertidoEn: null,
    });
    expect(inverso.instantanea().referencia).toBe('Reversión de Boleta 123');
    expect(inverso.esInverso).toBe(true);
  });

  it('una nota de débito se revierte con una de crédito', () => {
    const inverso = nota({ tipo: 'debito' }).revertir('2026-01-15', 'Error');

    expect(inverso.instantanea().tipo).toBe('credito');
  });

  it('el original queda revertido, con su motivo, y el inverso no', () => {
    const original = nota();

    const inverso = original.revertir('2026-01-15', '  Error de captura ');

    expect(original.estaRevertido).toBe(true);
    expect(original.instantanea()).toMatchObject({ motivoDeReversion: 'Error de captura', anuladoEn: null });
    expect(inverso.estaRevertido).toBe(false);
  });

  it('sin referencia, la del inverso dice de qué fecha era el original', () => {
    const inverso = nota({ referencia: null }).revertir('2026-01-20', 'Error');

    expect(inverso.instantanea().referencia).toBe('Reversión de movimiento del 2026-01-15');
  });

  it('exige un motivo, y no admite una fecha anterior a la del original', () => {
    expect(() => nota().revertir('2026-01-20', '   ')).toThrow(MotivoDeAnulacionInvalido);
    expect(() => nota().revertir('2026-01-20', 'x'.repeat(501))).toThrow(MotivoDeAnulacionInvalido);
    expect(() => nota().revertir('2026-01-14', 'Error')).toThrow(FechaDeReversionAnterior);
  });

  it('un inverso no se revierte, ni un original ya revertido', () => {
    const original = nota();
    const inverso = original.revertir('2026-01-15', 'Error');

    expect(() => inverso.revertir('2026-01-16', 'Otra vez')).toThrow(NoSeRevierteUnInverso);
    expect(() => original.revertir('2026-01-16', 'Otra vez')).toThrow(MovimientoYaRevertido);
  });

  it('una nota de transferencia o un cheque no se revierten sueltos', () => {
    const deTransferencia = Movimiento.crear(empresaId, datos(), { transferenciaId: 'una-transferencia' });

    expect(() => deTransferencia.revertir('2026-01-15', 'Error')).toThrow(MovimientoDeTransferencia);
    expect(() => nota({ tipo: 'cheque' }).revertir('2026-01-15', 'Error')).toThrow(MovimientoDeCheque);
  });
});

describe('las otras dos formas de revertir', () => {
  it('por su transferencia: revierte una nota que pertenece a ella', () => {
    const deTransferencia = Movimiento.crear(empresaId, datos({ tipo: 'debito' }), {
      transferenciaId: 'una-transferencia',
    });

    const inverso = deTransferencia.revertirPorTransferencia('2026-01-20', 'Duplicada');

    expect(inverso.instantanea()).toMatchObject({ tipo: 'credito', revierteAId: deTransferencia.id.valor });
    expect(inverso.instantanea().transferenciaId).toBeNull();
    expect(deTransferencia.estaRevertido).toBe(true);
  });

  it('por su cheque: el movimiento de un cheque se revierte con una nota de crédito', () => {
    const deCheque = nota({ tipo: 'cheque' });

    const inverso = deCheque.revertirPorCheque('2026-02-10', 'Nunca se cobró');

    expect(inverso.instantanea()).toMatchObject({ tipo: 'credito', fecha: '2026-02-10', monto: '100.00' });
    expect(deCheque.estaRevertido).toBe(true);
  });
});

describe('el saldo: efectoEnCentavos', () => {
  it('el original revertido sigue contando: el inverso es quien lo compensa', () => {
    const original = nota();
    const inverso = original.revertir('2026-01-15', 'Error');

    expect(original.efectoEnCentavos).toBe(10000);
    expect(inverso.efectoEnCentavos).toBe(-10000);
    expect(original.efectoEnCentavos + inverso.efectoEnCentavos).toBe(0);
  });

  it('un cheque cuenta como salida; anulado a la antigua, no cuenta', () => {
    const cheque = nota({ tipo: 'cheque' });
    expect(cheque.efectoEnCentavos).toBe(-10000);

    cheque.anularPorCheque('Se perdió');

    expect(cheque.estaAnulado).toBe(true);
    expect(cheque.efectoEnCentavos).toBe(0);
  });

  it('anular a la antigua exige motivo y no se hace dos veces', () => {
    const cheque = nota({ tipo: 'cheque' });

    expect(() => cheque.anularPorCheque(' ')).toThrow(MotivoDeAnulacionInvalido);
    cheque.anularPorCheque('Se perdió');
    expect(() => cheque.anularPorCheque('Otra vez')).toThrow(MovimientoAnulado);
  });
});

describe('lo que ya no se corrige ni se revierte', () => {
  it('un movimiento revertido o anulado ya no se corrige', () => {
    const revertido = nota();
    revertido.revertir('2026-01-15', 'Error');
    const anulado = nota({ tipo: 'cheque' });
    anulado.anularPorCheque('Se perdió');

    expect(() => revertido.corregir(datos())).toThrow(MovimientoYaRevertido);
    expect(() => anulado.corregir(datos())).toThrow(MovimientoAnulado);
  });

  it('un movimiento inverso no se corrige', () => {
    const inverso = nota().revertir('2026-01-15', 'Error');

    expect(() => inverso.corregir(datos())).toThrow(NoSeCorrigeUnInverso);
  });
});

describe('exigirEliminable y exigirNoMarcadoEnConciliacion', () => {
  it('una nota limpia se puede eliminar', () => {
    expect(() => nota().exigirEliminable()).not.toThrow();
  });

  it('ni el revertido ni el inverso se eliminan', () => {
    const original = nota();
    const inverso = original.revertir('2026-01-15', 'Error');

    expect(() => original.exigirEliminable()).toThrow(NoSeEliminaUnMovimientoRevertido);
    expect(() => inverso.exigirEliminable()).toThrow(NoSeEliminaUnInverso);
  });

  it('uno marcado en una conciliación no se elimina; sin marca, sí', () => {
    expect(() => nota().exigirNoMarcadoEnConciliacion('una-conciliacion')).toThrow(MovimientoMarcadoEnConciliacion);
    expect(() => nota().exigirNoMarcadoEnConciliacion(null)).not.toThrow();
  });
});
