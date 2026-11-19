import { describe, expect, it } from 'vitest';
import {
  exigirFechaDeLiquidacion,
  fechaDeReabrirElAnticipo,
  fechaMinimaDeLiquidacion,
  revisarLaLiquidacion,
  type LiquidacionPedida,
} from './liquidacion-del-anticipo.js';

const pedida = (cambios: Partial<LiquidacionPedida> = {}): LiquidacionPedida => ({
  devueltoCentavos: 0,
  noLiquidadoCentavos: 0,
  destino: null,
  cuotas: null,
  pagoVoluntario: false,
  motivoDeNoLiquidado: null,
  ...cambios,
});

const revisar = (porJustificarCentavos: number, cambios: Partial<LiquidacionPedida>, esEmpleado = true) =>
  revisarLaLiquidacion({ esEmpleado }, { porJustificarCentavos, pedida: pedida(cambios) });

describe('lo devuelto y lo no liquidado cuadran con lo que falta por justificar', () => {
  it('justificado del todo: no hay nada que devolver ni reembolsar', () => {
    expect(revisar(0, {})).toMatchObject({ devueltoCentavos: 0, reembolsadoCentavos: 0, destino: null });
  });

  it('lo que sobra se devuelve', () => {
    expect(revisar(25_000, { devueltoCentavos: 25_000 })).toMatchObject({ devueltoCentavos: 25_000 });
  });

  it('devuelto más no liquidado debe sumar lo que falta', () => {
    expect(() => revisar(25_000, { devueltoCentavos: 20_000 })).toThrowError(
      expect.objectContaining({ codigo: 'liquidacion_no_cuadra' }),
    );
    expect(() => revisar(0, { devueltoCentavos: 1 })).toThrowError(
      expect.objectContaining({ codigo: 'liquidacion_no_cuadra' }),
    );
  });

  it('si se gastó de más, se reembolsa lo gastado de más y no se devuelve ni se deja sin liquidar nada', () => {
    expect(revisar(-4_000, {})).toMatchObject({ reembolsadoCentavos: 4_000, devueltoCentavos: 0 });
    expect(() => revisar(-4_000, { devueltoCentavos: 4_000 })).toThrowError(
      expect.objectContaining({ codigo: 'liquidacion_no_cuadra' }),
    );
  });
});

describe('lo no liquidado', () => {
  const sinLiquidar = (cambios: Partial<LiquidacionPedida>, esEmpleado = true) =>
    revisar(
      10_000,
      { noLiquidadoCentavos: 10_000, motivoDeNoLiquidado: 'No presentó facturas', ...cambios },
      esEmpleado,
    );

  it('pide el destino y el motivo', () => {
    expect(() => sinLiquidar({ destino: null })).toThrowError(
      expect.objectContaining({ codigo: 'destino_de_no_liquidado_obligatorio' }),
    );
    expect(() => sinLiquidar({ destino: 'perdida', motivoDeNoLiquidado: '  ' })).toThrowError(
      expect.objectContaining({ codigo: 'motivo_de_no_liquidado_obligatorio' }),
    );
  });

  it('cobrar pide 5 cuotas o más, salvo pago voluntario', () => {
    expect(() => sinLiquidar({ destino: 'cobrar', cuotas: 4 })).toThrowError(
      expect.objectContaining({ codigo: 'cuotas_insuficientes' }),
    );
    expect(() => sinLiquidar({ destino: 'cobrar', cuotas: null })).toThrowError(
      expect.objectContaining({ codigo: 'cuotas_insuficientes' }),
    );
    expect(sinLiquidar({ destino: 'cobrar', cuotas: 5 })).toMatchObject({ destino: 'cobrar', cuotas: 5 });
    expect(sinLiquidar({ destino: 'cobrar', cuotas: 2, pagoVoluntario: true })).toMatchObject({ cuotas: 2 });
  });

  it('la renta del trabajo solo cabe en un empleado', () => {
    expect(sinLiquidar({ destino: 'renta_del_trabajo' })).toMatchObject({ destino: 'renta_del_trabajo', cuotas: null });
    expect(() => sinLiquidar({ destino: 'renta_del_trabajo' }, false)).toThrowError(
      expect.objectContaining({ codigo: 'renta_del_trabajo_solo_empleados' }),
    );
  });

  it('la pérdida no lleva cuotas y sin nada no liquidado no queda destino ni motivo', () => {
    expect(sinLiquidar({ destino: 'perdida', cuotas: 8 })).toMatchObject({ destino: 'perdida', cuotas: null });
    expect(revisar(0, { destino: 'cobrar', cuotas: 6, motivoDeNoLiquidado: 'x' })).toMatchObject({
      destino: null,
      cuotas: null,
      motivoDeNoLiquidado: null,
    });
  });
});

describe('fechas', () => {
  it('la liquidación no es futura ni anterior a la entrega o al último gasto', () => {
    const limites = { minima: '2026-11-10', hoy: '2026-11-18' };

    expect(() => exigirFechaDeLiquidacion('2026-11-19', limites)).toThrowError(
      expect.objectContaining({ codigo: 'fecha_de_liquidacion_invalida' }),
    );
    expect(() => exigirFechaDeLiquidacion('2026-11-09', limites)).toThrowError(
      expect.objectContaining({ codigo: 'fecha_de_liquidacion_invalida' }),
    );
    expect(() => exigirFechaDeLiquidacion('2026-11-10', limites)).not.toThrow();
  });

  it('la mínima es la del último gasto si es posterior a la entrega', () => {
    expect(fechaMinimaDeLiquidacion({ fecha: '2026-11-10' }, '2026-11-14')).toBe('2026-11-14');
    expect(fechaMinimaDeLiquidacion({ fecha: '2026-11-10' }, '2026-11-02')).toBe('2026-11-10');
    expect(fechaMinimaDeLiquidacion({ fecha: '2026-11-10' }, null)).toBe('2026-11-10');
  });

  it('la fecha de reabrir: con inverso la de Bancos, sin inverso la de la liquidación, sin movimiento hoy', () => {
    const hoy = '2026-11-18';
    expect(
      fechaDeReabrirElAnticipo('2026-11-12', { enBancos: 'con_inverso', fechaDelInverso: '2026-11-15', hoy }),
    ).toBe('2026-11-15');
    expect(fechaDeReabrirElAnticipo('2026-11-12', { enBancos: 'sin_inverso', fechaDelInverso: null, hoy })).toBe(
      '2026-11-12',
    );
    expect(fechaDeReabrirElAnticipo('2026-11-12', { enBancos: null, fechaDelInverso: null, hoy })).toBe(hoy);
  });
});
