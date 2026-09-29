import { describe, expect, it } from 'vitest';
import {
  accionesDeCheque,
  accionesDeMovimiento,
  accionesDeTransferencia,
  estaLimpio,
  type HechosDeUnMovimiento,
} from './acciones-posibles.js';

const limpia = (cambios: Partial<HechosDeUnMovimiento> = {}): HechosDeUnMovimiento => ({
  tipo: 'credito',
  saldoInicial: false,
  esDeTransferencia: false,
  marcadoEnConciliacion: false,
  anulado: false,
  revertido: false,
  esInverso: false,
  mesConciliado: false,
  cuentaConConciliaciones: false,
  ...cambios,
});

describe('estaLimpio', () => {
  it('lo que nunca pasó por el banco ni tiene historia de reversión', () => {
    expect(estaLimpio(limpia())).toBe(true);
  });

  it.each([
    ['marcado en una conciliación', { marcadoEnConciliacion: true }],
    ['con fecha en un mes conciliado', { mesConciliado: true }],
    ['anulado a la antigua', { anulado: true }],
    ['revertido', { revertido: true }],
    ['inverso de otro', { esInverso: true }],
  ])('no lo está si es %s', (_caso, cambios) => {
    expect(estaLimpio(limpia(cambios))).toBe(false);
  });
});

describe('accionesDeMovimiento', () => {
  it('una nota limpia se anula y se elimina', () => {
    expect(accionesDeMovimiento(limpia())).toEqual({ puedeAnular: true, puedeEliminar: true });
  });

  it('una nota conciliada se anula pero no se elimina', () => {
    expect(accionesDeMovimiento(limpia({ marcadoEnConciliacion: true, mesConciliado: true }))).toEqual({
      puedeAnular: true,
      puedeEliminar: false,
    });
  });

  it('una nota revertida y su inverso no se anulan ni se eliminan', () => {
    const esperado = { puedeAnular: false, puedeEliminar: false };

    expect(accionesDeMovimiento(limpia({ revertido: true }))).toEqual(esperado);
    expect(accionesDeMovimiento(limpia({ esInverso: true }))).toEqual(esperado);
  });

  it('las notas de una transferencia y los movimientos de cheque no se tocan sueltos', () => {
    const esperado = { puedeAnular: false, puedeEliminar: false };

    expect(accionesDeMovimiento(limpia({ esDeTransferencia: true }))).toEqual(esperado);
    expect(accionesDeMovimiento(limpia({ tipo: 'cheque' }))).toEqual(esperado);
  });

  it('el saldo inicial no se anula, y se elimina solo si la cuenta nunca se concilió', () => {
    expect(accionesDeMovimiento(limpia({ saldoInicial: true }))).toEqual({ puedeAnular: false, puedeEliminar: true });
    expect(accionesDeMovimiento(limpia({ saldoInicial: true, cuentaConConciliaciones: true }))).toEqual({
      puedeAnular: false,
      puedeEliminar: false,
    });
  });
});

describe('accionesDeTransferencia', () => {
  const notas = (origen = limpia(), destino = limpia()) => ({ origen, destino });

  it('recién registrada se anula y se elimina', () => {
    expect(accionesDeTransferencia(false, notas())).toEqual({ puedeAnular: true, puedeEliminar: true });
  });

  it('si una de sus dos notas no está limpia, se anula pero no se elimina', () => {
    const conUnaMarcada = notas(limpia(), limpia({ marcadoEnConciliacion: true }));

    expect(accionesDeTransferencia(false, conUnaMarcada)).toEqual({ puedeAnular: true, puedeEliminar: false });
  });

  it('anulada, ni se anula ni se elimina', () => {
    expect(accionesDeTransferencia(true, notas(limpia({ revertido: true }), limpia({ revertido: true })))).toEqual({
      puedeAnular: false,
      puedeEliminar: false,
    });
  });
});

describe('accionesDeCheque', () => {
  it('disponible: se anula, no se blanquea (no tiene movimiento)', () => {
    expect(accionesDeCheque('disponible', null)).toEqual({ puedeAnular: true, puedeBlanquear: false });
  });

  it('emitido con movimiento limpio: se anula y se blanquea', () => {
    expect(accionesDeCheque('emitido', limpia({ tipo: 'cheque' }))).toEqual({
      puedeAnular: true,
      puedeBlanquear: true,
    });
  });

  it('emitido con movimiento en un mes conciliado o marcado: se anula, no se blanquea', () => {
    const esperado = { puedeAnular: true, puedeBlanquear: false };

    expect(accionesDeCheque('emitido', limpia({ tipo: 'cheque', mesConciliado: true }))).toEqual(esperado);
    expect(accionesDeCheque('emitido', limpia({ tipo: 'cheque', marcadoEnConciliacion: true }))).toEqual(esperado);
  });

  it('anulado: no se anula ni se blanquea', () => {
    expect(accionesDeCheque('anulado', limpia({ tipo: 'cheque', anulado: true }))).toEqual({
      puedeAnular: false,
      puedeBlanquear: false,
    });
  });
});
