import { describe, expect, it } from 'vitest';
import {
  avisosDeLaPartida,
  diasEntre,
  fechaDeCorte,
  mesesEntre,
  periodoDeLaFechaDeInicio,
  revisarLaPartida,
  saldoDelBancoComoMovimiento,
  type PartidaPorRevisar,
} from './apertura.js';
import { BeneficiarioObligatorio } from './errores.js';
import {
  DescripcionDelErrorObligatoria,
  NumeroDeChequeObligatorio,
  PartidaDespuesDelCorte,
  PosfechadoNoPosterior,
  SentidoDelErrorObligatorio,
} from './errores-de-apertura.js';

const CORTE = '2025-12-31';

const partida = (cambios: Partial<PartidaPorRevisar> = {}): PartidaPorRevisar => ({
  parte: 'deposito_en_transito',
  fecha: '2025-12-30',
  sentido: null,
  numeroDeCheque: null,
  beneficiario: null,
  referencia: null,
  observaciones: null,
  ...cambios,
});

describe('fecha de corte y cuentas de tiempo', () => {
  it('el corte es el día anterior a la fecha de inicio, también al cruzar mes y año', () => {
    expect(fechaDeCorte('2026-01-01')).toBe('2025-12-31');
    expect(fechaDeCorte('2026-03-01')).toBe('2026-02-28');
    expect(fechaDeCorte('2024-03-01')).toBe('2024-02-29');
    expect(fechaDeCorte('2026-10-04')).toBe('2026-10-03');
  });

  it('cuenta días corridos y meses cumplidos', () => {
    expect(diasEntre('2025-12-01', '2025-12-31')).toBe(30);
    expect(diasEntre('2025-11-30', '2025-12-31')).toBe(31);
    expect(mesesEntre('2025-06-15', '2025-12-15')).toBe(6);
    expect(mesesEntre('2025-06-15', '2025-12-14')).toBe(5);
    expect(mesesEntre('2025-04-30', '2025-12-31')).toBe(8);
  });

  it('el período de la primera conciliación es el mes de la fecha de inicio', () => {
    expect(periodoDeLaFechaDeInicio('2026-01-01')).toEqual({ anio: 2026, mes: 1 });
  });
});

describe('avisos de una partida', () => {
  const cheque = (fecha: string) => ({ parte: 'cheque_en_circulacion' as const, fecha, numeroDeCheque: 77 });

  it('un cheque con tantos meses como la variable avisa, con la cuenta real de meses y el artículo 508', () => {
    const avisos = avisosDeLaPartida(cheque('2025-05-15'), { corte: CORTE, mesesDeVencimiento: 7 });
    expect(avisos).toHaveLength(1);
    expect(avisos[0]!.codigo).toBe('cheque_antiguo');
    expect(avisos[0]!.mensaje).toContain('El cheque 77 es del 15/05/2025');
    expect(avisos[0]!.mensaje).toContain('al 31/12/2025 tiene 7 meses');
    expect(avisos[0]!.mensaje).toContain('art. 508');
  });

  it('con la variable cambiada a 6, un cheque de 6 meses avisa y con 7 no avisaba', () => {
    const deSeisMeses = cheque('2025-06-30');
    expect(avisosDeLaPartida(deSeisMeses, { corte: CORTE, mesesDeVencimiento: 7 })).toEqual([]);
    expect(avisosDeLaPartida(deSeisMeses, { corte: CORTE, mesesDeVencimiento: 6 })).toHaveLength(1);
  });

  it('un depósito de 31 días avisa y uno de 30 no', () => {
    const deposito = (fecha: string) => ({ parte: 'deposito_en_transito' as const, fecha, numeroDeCheque: null });
    const contexto = { corte: CORTE, mesesDeVencimiento: 7 };
    expect(avisosDeLaPartida(deposito('2025-12-01'), contexto)).toEqual([]);
    const viejo = avisosDeLaPartida(deposito('2025-11-30'), contexto);
    expect(viejo.map((aviso) => aviso.codigo)).toEqual(['deposito_viejo']);
    expect(viejo[0]!.mensaje).toContain('tiene 31 días al corte');
  });

  it('las demás partes no avisan', () => {
    const contexto = { corte: CORTE, mesesDeVencimiento: 7 };
    for (const parte of ['debito_en_transito', 'error_del_banco', 'cheque_posfechado'] as const) {
      expect(avisosDeLaPartida({ parte, fecha: '2025-01-01', numeroDeCheque: null }, contexto)).toEqual([]);
    }
  });
});

describe('revisar una partida', () => {
  it('toda partida menos el posfechado es del corte o antes', () => {
    expect(() => revisarLaPartida(partida({ fecha: CORTE }), CORTE)).not.toThrow();
    expect(() => revisarLaPartida(partida({ fecha: '2026-01-01' }), CORTE)).toThrow(PartidaDespuesDelCorte);
  });

  it('el posfechado es posterior al corte', () => {
    const posfechado = { parte: 'cheque_posfechado' as const, numeroDeCheque: 5, beneficiario: 'Ferretería' };
    expect(() => revisarLaPartida(partida({ ...posfechado, fecha: '2026-02-10' }), CORTE)).not.toThrow();
    expect(() => revisarLaPartida(partida({ ...posfechado, fecha: CORTE }), CORTE)).toThrow(PosfechadoNoPosterior);
  });

  it('un cheque pide número y beneficiario', () => {
    const cheque = partida({ parte: 'cheque_en_circulacion', beneficiario: 'Proveedor', numeroDeCheque: 10 });
    expect(() => revisarLaPartida(cheque, CORTE)).not.toThrow();
    expect(() => revisarLaPartida({ ...cheque, numeroDeCheque: null }, CORTE)).toThrow(NumeroDeChequeObligatorio);
    expect(() => revisarLaPartida({ ...cheque, beneficiario: null }, CORTE)).toThrow(BeneficiarioObligatorio);
  });

  it('el error del banco pide sentido y una descripción (referencia u observaciones)', () => {
    const error = partida({ parte: 'error_del_banco', sentido: 'credito', referencia: 'Cargo duplicado' });
    expect(() => revisarLaPartida(error, CORTE)).not.toThrow();
    expect(() => revisarLaPartida({ ...error, sentido: null }, CORTE)).toThrow(SentidoDelErrorObligatorio);
    expect(() => revisarLaPartida({ ...error, referencia: null }, CORTE)).toThrow(DescripcionDelErrorObligatoria);
    expect(() =>
      revisarLaPartida({ ...error, referencia: null, observaciones: 'Lo corrige en enero' }, CORTE),
    ).not.toThrow();
  });
});

describe('el saldo según el estado de cuenta como movimiento', () => {
  it('positivo es crédito y negativo, débito con el monto siempre positivo', () => {
    expect(saldoDelBancoComoMovimiento('1500.50')).toEqual({ tipo: 'credito', monto: '1500.50' });
    expect(saldoDelBancoComoMovimiento('-200.05')).toEqual({ tipo: 'debito', monto: '200.05' });
  });
});
