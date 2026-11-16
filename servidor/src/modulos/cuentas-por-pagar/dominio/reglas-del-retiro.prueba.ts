import { describe, expect, it } from 'vitest';
import {
  RetiroCobrado,
  RetiroConPagos,
  RetiroLiquidado,
  RetiroNoLiquidado,
  RetiroYaAnulado,
} from './errores-de-retiros.js';
import { exigirRetiroAbierto, exigirRetiroAnulable, exigirRetiroLiquidado } from './reglas-del-retiro.js';
import type { EstadoDeRetiro, RetiroDeEfectivo } from './retiros.js';

const retiro = (estado: EstadoDeRetiro): RetiroDeEfectivo => ({
  id: 'r1',
  numero: 7,
  anioDeNumero: 0,
  forma: 'cheque',
  fecha: '2026-11-10',
  montoCentavos: 100000,
  movimientoId: 'm1',
  custodio: 'Juan',
  custodioUsuarioId: null,
  observaciones: null,
  estado,
  fechaDeLiquidacion: null,
  liquidadoPor: null,
  devueltoCentavos: 0,
  movimientoDeDevolucionId: null,
  faltanteCentavos: 0,
  motivoDeFaltante: null,
  fechaDeAnulacion: null,
  motivoDeAnulacion: null,
});

describe('las reglas del estado del retiro', () => {
  it('solo un retiro abierto se anula o se liquida', () => {
    expect(() => exigirRetiroAbierto(retiro('abierto'))).not.toThrow();
    expect(() => exigirRetiroAbierto(retiro('liquidado'))).toThrow(RetiroLiquidado);
    expect(() => exigirRetiroAbierto(retiro('anulado'))).toThrow(RetiroYaAnulado);
  });

  it('solo un retiro liquidado se reabre', () => {
    expect(() => exigirRetiroLiquidado(retiro('liquidado'))).not.toThrow();
    expect(() => exigirRetiroLiquidado(retiro('abierto'))).toThrow(RetiroNoLiquidado);
    expect(() => exigirRetiroLiquidado(retiro('anulado'))).toThrow(RetiroYaAnulado);
  });
});

describe('cuándo se anula un retiro', () => {
  it('abierto, sin pagos vigentes y con el cheque sin cobrar', () => {
    expect(() => exigirRetiroAnulable(retiro('abierto'), { pagosVigentes: [], conciliado: false })).not.toThrow();
  });

  it('con pagos vigentes dice cuáles son', () => {
    const con = { pagosVigentes: ['3', '4'], conciliado: false };

    expect(() => exigirRetiroAnulable(retiro('abierto'), con)).toThrow(RetiroConPagos);
    expect(() => exigirRetiroAnulable(retiro('abierto'), con)).toThrow('los pagos 3, 4');
  });

  it('con el cheque cobrado pide depositar y liquidar', () => {
    expect(() => exigirRetiroAnulable(retiro('abierto'), { pagosVigentes: [], conciliado: true })).toThrow(
      RetiroCobrado,
    );
  });

  it('liquidado o anulado se rechaza antes que lo demás', () => {
    expect(() => exigirRetiroAnulable(retiro('liquidado'), { pagosVigentes: ['1'], conciliado: true })).toThrow(
      RetiroLiquidado,
    );
    expect(() => exigirRetiroAnulable(retiro('anulado'), { pagosVigentes: [], conciliado: false })).toThrow(
      RetiroYaAnulado,
    );
  });
});
