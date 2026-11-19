import { describe, expect, it } from 'vitest';
import { desglosarLaReposicion, totalDeLaReposicion } from './desglose-de-reposicion.js';
import type { ComprobanteParaDesglosar } from './reposiciones.js';

const gasto = (firmadoCentavos: number, conActivoFijo = false): ComprobanteParaDesglosar => ({
  clase: 'documento',
  conActivoFijo,
  firmadoCentavos,
});
const nota = (centavos: number): ComprobanteParaDesglosar => ({
  clase: 'documento',
  conActivoFijo: false,
  firmadoCentavos: -centavos,
});
const sobrante = (centavos: number): ComprobanteParaDesglosar => ({
  clase: 'sobrante',
  conActivoFijo: false,
  firmadoCentavos: -centavos,
});
const faltante = (centavos: number): ComprobanteParaDesglosar => ({
  clase: 'faltante',
  conActivoFijo: false,
  firmadoCentavos: centavos,
});

describe('desglosarLaReposicion', () => {
  it('reparte lo gastado en operación, lo de activo fijo y los faltantes', () => {
    const desglose = desglosarLaReposicion([gasto(10_000), gasto(50_000, true), faltante(2_500), gasto(5_000)]);

    expect(desglose).toEqual({ operacionCentavos: 15_000, activoCentavos: 50_000, faltanteCentavos: 2_500 });
  });

  it('las notas de crédito y los sobrantes rebajan la línea de operación', () => {
    const desglose = desglosarLaReposicion([gasto(10_000), nota(3_000), sobrante(1_000)]);

    expect(desglose).toEqual({ operacionCentavos: 6_000, activoCentavos: 0, faltanteCentavos: 0 });
  });

  it('si lo que resta pasa de operación, el resto se rebaja de la línea de activo fijo', () => {
    const desglose = desglosarLaReposicion([gasto(2_000), nota(5_000), gasto(20_000, true)]);

    expect(desglose).toEqual({ operacionCentavos: 0, activoCentavos: 17_000, faltanteCentavos: 0 });
  });

  it('si ni el activo alcanza, lo rebaja del faltante y sigue sumando el total', () => {
    const comprobantes = [faltante(10_000), sobrante(4_000)];

    const desglose = desglosarLaReposicion(comprobantes);

    expect(desglose).toEqual({ operacionCentavos: 0, activoCentavos: 0, faltanteCentavos: 6_000 });
    expect(desglose.operacionCentavos + desglose.activoCentavos + desglose.faltanteCentavos).toBe(
      totalDeLaReposicion(comprobantes),
    );
  });

  it('ninguna parte queda en negativo cuando el total es positivo', () => {
    const comprobantes = [nota(7_000), gasto(3_000, true), faltante(9_000), gasto(1_000)];

    const desglose = desglosarLaReposicion(comprobantes);

    expect(Object.values(desglose).every((parte) => parte >= 0)).toBe(true);
    expect(Object.values(desglose).reduce((suma, parte) => suma + parte, 0)).toBe(6_000);
  });
});

describe('totalDeLaReposicion', () => {
  it('suma con signo', () => {
    expect(totalDeLaReposicion([gasto(10_000), nota(2_500), sobrante(500)])).toBe(7_000);
  });
});
