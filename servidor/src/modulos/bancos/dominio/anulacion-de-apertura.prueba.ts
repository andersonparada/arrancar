import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { exigirPartidaQueSeAnula, pagadorDeLaAnulacion } from './anulacion-de-apertura.js';
import {
  ElPosfechadoSeAnulaComoCheque,
  NoSeAnulaElSaldoDelBanco,
  PagadorObligatorio,
  PartidaDeAperturaNoEncontrada,
} from './errores-de-apertura.js';
import { MovimientoYaRevertido } from './errores.js';
import { Movimiento, type DatosDeMovimiento } from './movimiento.js';
import type { ParteDeApertura } from './partes-de-apertura.js';

const empresaId = Identificador.nuevo<'Empresa'>();

const datos = (cambios: Partial<DatosDeMovimiento> = {}): DatosDeMovimiento => ({
  cuentaBancariaId: 'cuenta-1',
  tipo: 'credito',
  fecha: '2025-12-20',
  monto: '300.00',
  saldoInicial: true,
  referencia: null,
  beneficiario: 'Dato original',
  observaciones: null,
  conceptoId: 'saldo-inicial',
  ...cambios,
});

const partida = (parte: ParteDeApertura, cambios: Partial<DatosDeMovimiento> = {}) =>
  Movimiento.crear(empresaId, datos(cambios), { apertura: { parte, saldoInicialId: 'cabecera-1' } });

const inverso = { conceptoId: 'anulacion', pagador: null };

describe('qué partidas se anulan', () => {
  it('el cheque, el depósito, el débito en tránsito y el error del banco se anulan', () => {
    for (const parte of [
      'cheque_en_circulacion',
      'deposito_en_transito',
      'debito_en_transito',
      'error_del_banco',
    ] as const) {
      expect(exigirPartidaQueSeAnula(parte)).toBe(parte);
    }
  });

  it('el saldo del banco y el global no (se corrigen o se eliminan), el posfechado se anula como cheque y un movimiento normal no es partida', () => {
    expect(() => exigirPartidaQueSeAnula('saldo_del_banco')).toThrow(NoSeAnulaElSaldoDelBanco);
    expect(() => exigirPartidaQueSeAnula('saldo_global')).toThrow(NoSeAnulaElSaldoDelBanco);
    expect(() => exigirPartidaQueSeAnula('cheque_posfechado')).toThrow(ElPosfechadoSeAnulaComoCheque);
    expect(() => exigirPartidaQueSeAnula(null)).toThrow(PartidaDeAperturaNoEncontrada);
  });
});

describe('el pagador del depósito rechazado', () => {
  it('es obligatorio en el depósito, de 1 a 150 caracteres, y se guarda sin espacios a los lados', () => {
    expect(pagadorDeLaAnulacion('deposito_en_transito', '  Cliente, S.A.  ')).toBe('Cliente, S.A.');
    expect(pagadorDeLaAnulacion('deposito_en_transito', 'x'.repeat(150))).toHaveLength(150);
    for (const invalido of [null, undefined, '', '   ', 'x'.repeat(151)]) {
      expect(() => pagadorDeLaAnulacion('deposito_en_transito', invalido)).toThrow(PagadorObligatorio);
    }
  });

  it('las demás partes no lo llevan: lo que se mande se ignora', () => {
    expect(pagadorDeLaAnulacion('cheque_en_circulacion', 'Alguien')).toBeNull();
    expect(pagadorDeLaAnulacion('error_del_banco', undefined)).toBeNull();
  });
});

describe('Movimiento.revertirPartidaDeApertura', () => {
  it('el inverso del depósito es un débito con el concepto de la anulación y el pagador como beneficiario', () => {
    const deposito = partida('deposito_en_transito');

    const resultado = deposito.revertirPartidaDeApertura('2026-02-10', 'Rebotó', {
      conceptoId: 'anulacion',
      pagador: 'Cliente',
    });

    expect(resultado.instantanea()).toMatchObject({
      tipo: 'debito',
      fecha: '2026-02-10',
      monto: '300.00',
      conceptoId: 'anulacion',
      beneficiario: 'Cliente',
      saldoInicial: false,
      revierteAId: deposito.id.valor,
      parteDeApertura: null,
    });
    expect(deposito.estaRevertido).toBe(true);
  });

  it('sin pagador el inverso conserva el beneficiario del original (cheque en circulación)', () => {
    const cheque = partida('cheque_en_circulacion', { tipo: 'cheque', beneficiario: 'Proveedor' });

    const resultado = cheque.revertirPartidaDeApertura('2026-03-01', 'Caduco', inverso);

    expect(resultado.instantanea()).toMatchObject({
      tipo: 'credito',
      beneficiario: 'Proveedor',
      conceptoId: 'anulacion',
    });
  });

  it('no revierte el saldo del banco ni el posfechado, ni una partida que ya se anuló', () => {
    expect(() => partida('saldo_del_banco').revertirPartidaDeApertura('2026-02-10', 'x', inverso)).toThrow(
      NoSeAnulaElSaldoDelBanco,
    );
    expect(() =>
      partida('cheque_posfechado', { tipo: 'cheque' }).revertirPartidaDeApertura('2026-02-10', 'x', inverso),
    ).toThrow(ElPosfechadoSeAnulaComoCheque);
    const anulada = partida('error_del_banco');
    anulada.revertirPartidaDeApertura('2026-02-10', 'x', inverso);
    expect(() => anulada.revertirPartidaDeApertura('2026-02-11', 'x', inverso)).toThrow(MovimientoYaRevertido);
  });
});
