import { describe, expect, it } from 'vitest';
import {
  accionesDeCheque,
  accionesDeMovimiento,
  accionesDeTransferencia,
  estaLimpio,
  estaMarcada,
  type HechosDeUnMovimiento,
} from './acciones-posibles.js';

const limpia = (cambios: Partial<HechosDeUnMovimiento> = {}): HechosDeUnMovimiento => ({
  tipo: 'credito',
  saldoInicial: false,
  parteDeApertura: null,
  esDeTransferencia: false,
  marcadoEnConciliacion: false,
  anulado: false,
  revertido: false,
  esInverso: false,
  esDeOtroModulo: false,
  conceptoEsDePago: false,
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
    expect(accionesDeMovimiento(limpia())).toMatchObject({ puedeAnular: true, puedeEliminar: true });
  });

  it('una nota conciliada se anula pero no se elimina', () => {
    expect(accionesDeMovimiento(limpia({ marcadoEnConciliacion: true, mesConciliado: true }))).toMatchObject({
      puedeAnular: true,
      puedeEliminar: false,
    });
  });

  it('una nota revertida y su inverso no se anulan ni se eliminan', () => {
    const esperado = { puedeAnular: false, puedeEliminar: false };

    expect(accionesDeMovimiento(limpia({ revertido: true }))).toMatchObject(esperado);
    expect(accionesDeMovimiento(limpia({ esInverso: true }))).toMatchObject(esperado);
  });

  it('las notas de una transferencia y los movimientos de cheque no se tocan sueltos', () => {
    const esperado = { puedeAnular: false, puedeEliminar: false };

    expect(accionesDeMovimiento(limpia({ esDeTransferencia: true }))).toMatchObject(esperado);
    expect(accionesDeMovimiento(limpia({ tipo: 'cheque' }))).toMatchObject(esperado);
  });

  it('lo que generó otro módulo no se reclasifica en Bancos (P6)', () => {
    expect(accionesDeMovimiento(limpia())).toMatchObject({ puedeReclasificar: true });
    expect(accionesDeMovimiento(limpia({ esDeOtroModulo: true }))).toMatchObject({ puedeReclasificar: false });
  });

  it('el saldo inicial no se anula, y se elimina solo si la cuenta nunca se concilió', () => {
    expect(accionesDeMovimiento(limpia({ saldoInicial: true }))).toMatchObject({
      puedeAnular: false,
      puedeEliminar: true,
    });
    expect(accionesDeMovimiento(limpia({ saldoInicial: true, cuentaConConciliaciones: true }))).toMatchObject({
      puedeAnular: false,
      puedeEliminar: false,
    });
  });
});

describe('puedeReclasificar', () => {
  it('una nota o un cheque original se reclasifica, aunque el mes esté conciliado o ya esté revertido', () => {
    expect(accionesDeMovimiento(limpia()).puedeReclasificar).toBe(true);
    expect(accionesDeMovimiento(limpia({ tipo: 'cheque' })).puedeReclasificar).toBe(true);
    expect(accionesDeMovimiento(limpia({ marcadoEnConciliacion: true, mesConciliado: true })).puedeReclasificar).toBe(
      true,
    );
    expect(accionesDeMovimiento(limpia({ revertido: true })).puedeReclasificar).toBe(true);
  });

  it('un inverso, las notas de una transferencia y el saldo inicial no se reclasifican', () => {
    expect(accionesDeMovimiento(limpia({ esInverso: true })).puedeReclasificar).toBe(false);
    expect(accionesDeMovimiento(limpia({ esDeTransferencia: true })).puedeReclasificar).toBe(false);
    expect(accionesDeMovimiento(limpia({ saldoInicial: true })).puedeReclasificar).toBe(false);
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
  const sinImpresion = { puedeImprimir: false, puedeReimprimir: false, puedePasarAOtroFormulario: false };

  it('disponible: se anula, no se blanquea (no tiene movimiento)', () => {
    expect(accionesDeCheque('disponible', null)).toEqual({
      puedeAnular: true,
      puedeBlanquear: false,
      ...sinImpresion,
    });
  });

  it('emitido con movimiento limpio: se anula, se blanquea y se imprime', () => {
    expect(accionesDeCheque('emitido', limpia({ tipo: 'cheque' }))).toEqual({
      puedeAnular: true,
      puedeBlanquear: true,
      puedeImprimir: true,
      puedeReimprimir: false,
      puedePasarAOtroFormulario: false,
    });
  });

  it('emitido con movimiento en un mes conciliado o marcado: se anula e imprime, no se blanquea', () => {
    const esperado = { puedeAnular: true, puedeBlanquear: false, ...sinImpresion, puedeImprimir: true };

    expect(accionesDeCheque('emitido', limpia({ tipo: 'cheque', mesConciliado: true }))).toEqual(esperado);
    expect(accionesDeCheque('emitido', limpia({ tipo: 'cheque', marcadoEnConciliacion: true }))).toEqual(esperado);
  });

  it('anulado: no se anula, ni se blanquea, ni se imprime', () => {
    expect(accionesDeCheque('anulado', limpia({ tipo: 'cheque', anulado: true }))).toEqual({
      puedeAnular: false,
      puedeBlanquear: false,
      ...sinImpresion,
    });
  });

  it('impreso: se reimprime y, con el movimiento limpio, pasa a otro formulario; no se imprime ni se blanquea', () => {
    expect(accionesDeCheque('emitido', limpia({ tipo: 'cheque' }), true)).toEqual({
      puedeAnular: true,
      puedeBlanquear: false,
      puedeImprimir: false,
      puedeReimprimir: true,
      puedePasarAOtroFormulario: true,
    });
  });

  it('impreso con su mes conciliado: se reimprime, pero no pasa a otro formulario', () => {
    const conciliado = limpia({ tipo: 'cheque', mesConciliado: true });

    expect(accionesDeCheque('emitido', conciliado, true)).toMatchObject({
      puedeReimprimir: true,
      puedePasarAOtroFormulario: false,
    });
  });

  it('de la carga inicial no se imprime ni se reimprime', () => {
    const deApertura = limpia({ tipo: 'cheque', parteDeApertura: 'cheque_en_circulacion' });

    expect(accionesDeCheque('emitido', deApertura)).toMatchObject({ puedeImprimir: false, puedeReimprimir: false });
    expect(accionesDeCheque('emitido', deApertura, true)).toMatchObject({
      puedeReimprimir: false,
      puedePasarAOtroFormulario: false,
    });
  });
});

describe('lo que generó otro módulo y las notas marcadas (CP4)', () => {
  const debito = (cambios: Partial<HechosDeUnMovimiento> = {}) => limpia({ tipo: 'debito', ...cambios });

  it('lo de otro módulo se anula, pero no se elimina ni se blanquea ni se marca', () => {
    const hechos = debito({ esDeOtroModulo: true });

    expect(accionesDeMovimiento(hechos)).toMatchObject({
      puedeAnular: true,
      puedeEliminar: false,
      puedeMarcar: false,
      puedeDesmarcar: false,
    });
    expect(accionesDeCheque('emitido', limpia({ tipo: 'cheque', esDeOtroModulo: true })).puedeBlanquear).toBe(false);
    expect(accionesDeCheque('emitido', limpia({ tipo: 'cheque' }), true).puedeBlanquear).toBe(false);
    expect(
      accionesDeCheque('emitido', limpia({ tipo: 'cheque', parteDeApertura: 'cheque_en_circulacion' })).puedeBlanquear,
    ).toBe(false);
    expect(
      accionesDeCheque('emitido', limpia({ tipo: 'cheque', parteDeApertura: 'cheque_posfechado' })).puedeBlanquear,
    ).toBe(false);
  });

  it('una nota de débito suelta con el concepto de pago a proveedores está marcada: se desmarca, no se marca', () => {
    const marcada = debito({ conceptoEsDePago: true });

    expect(estaMarcada(marcada)).toBe(true);
    expect(accionesDeMovimiento(marcada)).toMatchObject({ puedeMarcar: false, puedeDesmarcar: true });
    expect(accionesDeMovimiento(debito())).toMatchObject({ puedeMarcar: true, puedeDesmarcar: false });
  });

  it('el mismo concepto en un crédito, un cheque, una transferencia, un inverso o lo de otro módulo no es marca', () => {
    for (const cambios of [
      { tipo: 'credito' as const },
      { tipo: 'cheque' as const },
      { esDeTransferencia: true },
      { esInverso: true },
      { esDeOtroModulo: true },
      { saldoInicial: true },
    ]) {
      expect(estaMarcada(debito({ conceptoEsDePago: true, ...cambios }))).toBe(false);
    }
  });

  it('una nota anulada o revertida no se marca ni se desmarca', () => {
    for (const cambios of [{ anulado: true }, { revertido: true }]) {
      expect(accionesDeMovimiento(debito(cambios))).toMatchObject({ puedeMarcar: false });
      expect(accionesDeMovimiento(debito({ conceptoEsDePago: true, ...cambios }))).toMatchObject({
        puedeDesmarcar: false,
      });
    }
  });
});
