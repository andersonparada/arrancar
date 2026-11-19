import { describe, expect, it } from 'vitest';
import { cuotasDelTramo } from './cuotas-del-tramo.js';
import { abrirTramoContable } from './libro-contable.js';
import { abrirTramoFiscal } from './libro-fiscal.js';
import { primerMesDelTramo, sumarMeses } from './meses.js';
import { dividirRedondeando } from './redondeo.js';
import { tramosDeInicioDeUso } from './inicio-de-uso.js';

const suma = (cuotas: number[], hasta = cuotas.length) => cuotas.slice(0, hasta).reduce((a, b) => a + b, 0);

describe('meses', () => {
  it('el primer mes depende de la regla de la empresa (§7.1)', () => {
    expect(primerMesDelTramo('2027-03-10', 'mes_de_inicio')).toBe('2027-03-01');
    expect(primerMesDelTramo('2027-03-10', 'mes_siguiente')).toBe('2027-04-01');
    expect(primerMesDelTramo('2027-12-31', 'mes_siguiente')).toBe('2028-01-01');
    expect(sumarMeses('2027-03-01', 59)).toBe('2032-02-01');
  });

  it('redondea la mitad hacia arriba con enteros', () => {
    expect(dividirRedondeando(5, 2)).toBe(3);
    expect(dividirRedondeando(25000000 * 20, 1200)).toBe(416667);
    expect(dividirRedondeando(0, 7)).toBe(0);
  });
});

describe('ejemplo del pick-up (§7.5)', () => {
  const tramos = tramosDeInicioDeUso({
    fechaDeInicioDeUso: '2027-03-10',
    primerMes: 'mes_de_inicio',
    costoCentavos: 25000000,
    baseFiscalCentavos: 25000000,
    porcentajeFiscal: '20.00',
    vidaUtilContableMeses: 60,
    valorResidualCentavos: 2500000,
  });

  it('el contable da 3,750.00 por mes durante 60 meses desde marzo de 2027', () => {
    expect(tramos.contable).toMatchObject({
      desdePeriodo: '2027-03-01',
      causa: 'inicio_de_uso',
      porDepreciarCentavos: 22500000,
      meses: 60,
      cuotaMensualCentavos: 375000,
      excesoDeNotaDeCreditoCentavos: 0,
    });
    const cuotas = cuotasDelTramo(tramos.contable);
    expect(cuotas).toHaveLength(60);
    expect(new Set(cuotas)).toEqual(new Set([375000]));
    expect(sumarMeses(tramos.contable.desdePeriodo, 59)).toBe('2032-02-01');
  });

  it('el fiscal da 4,166.67 en 59 cuotas y la 60.ª es de 4,166.47', () => {
    expect(tramos.fiscal).toMatchObject({
      porDepreciarCentavos: 25000000,
      porcentaje: '20.00',
      baseDelPorcentajeCentavos: 25000000,
      cuotaMensualCentavos: 416667,
      valorResidualCentavos: 0,
      meses: null,
    });
    const cuotas = cuotasDelTramo(tramos.fiscal);
    expect(cuotas).toHaveLength(60);
    expect(suma(cuotas, 59)).toBe(24583353);
    expect(cuotas[59]).toBe(416647);
    expect(suma(cuotas)).toBe(25000000);
  });

  it('en diciembre de 2027 (10 cuotas) la diferencia temporaria es 4,166.70', () => {
    const fiscal = suma(cuotasDelTramo(tramos.fiscal), 10);
    const contable = suma(cuotasDelTramo(tramos.contable), 10);
    expect(fiscal).toBe(4166670);
    expect(contable).toBe(3750000);
    expect(fiscal - contable).toBe(416670);
  });

  it('con «mes siguiente» el tramo empieza en abril', () => {
    const siguiente = tramosDeInicioDeUso({
      fechaDeInicioDeUso: '2027-03-10',
      primerMes: 'mes_siguiente',
      costoCentavos: 100,
      baseFiscalCentavos: 100,
      porcentajeFiscal: '20.00',
      vidaUtilContableMeses: 12,
      valorResidualCentavos: 0,
    });
    expect(siguiente.contable.desdePeriodo).toBe('2027-04-01');
    expect(siguiente.fiscal.desdePeriodo).toBe('2027-04-01');
  });
});

describe('contable: el último mes absorbe el redondeo', () => {
  it('Q100.00 en 3 meses: 33.33, 33.33 y 33.34', () => {
    const tramo = abrirTramoContable({
      desdePeriodo: '2027-01-01',
      causa: 'inicio_de_uso',
      costoCentavos: 10000,
      acumuladaCentavos: 0,
      valorResidualCentavos: 0,
      meses: 3,
    });
    expect(cuotasDelTramo(tramo)).toEqual([3333, 3333, 3334]);
  });

  it('exige meses enteros positivos', () => {
    const entrada = {
      desdePeriodo: '2027-01-01',
      causa: 'inicio_de_uso' as const,
      costoCentavos: 1,
      acumuladaCentavos: 0,
      valorResidualCentavos: 0,
    };
    expect(() => abrirTramoContable({ ...entrada, meses: 0 })).toThrow(RangeError);
    expect(() => abrirTramoContable({ ...entrada, meses: 1.5 })).toThrow(RangeError);
  });

  it('un activo totalmente depreciado en el libro (residual igual al costo) no da cuotas', () => {
    const tramo = abrirTramoContable({
      desdePeriodo: '2027-01-01',
      causa: 'inicio_de_uso',
      costoCentavos: 5000,
      acumuladaCentavos: 0,
      valorResidualCentavos: 5000,
      meses: 12,
    });
    expect(cuotasDelTramo(tramo)).toEqual([]);
  });
});

describe('exceso de nota de crédito, uno por libro (§7.4)', () => {
  // Costo 100,000.00 con 30,000.00 depreciados y residual contable de 20,000.00; una nota de crédito de 55,000.00.
  const nuevoCosto = 4500000;
  const acumulada = 3000000;

  it('el contable queda en cero y lo que sobra del residual va al exceso; el fiscal sigue depreciando', () => {
    const contable = abrirTramoContable({
      desdePeriodo: '2027-07-01',
      causa: 'costo_posterior',
      costoCentavos: nuevoCosto,
      acumuladaCentavos: acumulada,
      valorResidualCentavos: 2000000,
      meses: 30,
    });
    const fiscal = abrirTramoFiscal({
      desdePeriodo: '2027-07-01',
      causa: 'costo_posterior',
      baseFiscalCentavos: nuevoCosto,
      acumuladaCentavos: acumulada,
      porcentaje: '20.00',
    });
    expect(contable).toMatchObject({
      porDepreciarCentavos: 0,
      cuotaMensualCentavos: 0,
      excesoDeNotaDeCreditoCentavos: 500000,
    });
    expect(fiscal).toMatchObject({ porDepreciarCentavos: 1500000, excesoDeNotaDeCreditoCentavos: 0 });
    expect(cuotasDelTramo(contable)).toEqual([]);
    expect(suma(cuotasDelTramo(fiscal))).toBe(1500000);
  });

  it('el fiscal queda en cero cuando la base baja de lo ya depreciado, con su propio monto', () => {
    const fiscal = abrirTramoFiscal({
      desdePeriodo: '2027-07-01',
      causa: 'costo_posterior',
      baseFiscalCentavos: 2500000,
      acumuladaCentavos: acumulada,
      porcentaje: '20.00',
    });
    expect(fiscal).toMatchObject({
      porDepreciarCentavos: 0,
      cuotaMensualCentavos: 0,
      excesoDeNotaDeCreditoCentavos: 500000,
    });
    expect(cuotasDelTramo(fiscal)).toEqual([]);
  });

  it('nunca hay cuotas negativas', () => {
    const fiscal = abrirTramoFiscal({
      desdePeriodo: '2027-07-01',
      causa: 'costo_posterior',
      baseFiscalCentavos: 0,
      acumuladaCentavos: 100,
      porcentaje: '20.00',
    });
    expect(fiscal.porDepreciarCentavos).toBe(0);
    expect(fiscal.cuotaMensualCentavos).toBe(0);
  });
});

describe('fiscal: una mejora y el costo posterior usan bases distintas (§7.3)', () => {
  it('en una mejora la base del porcentaje es el saldo por depreciar; en un costo posterior, la base total', () => {
    const mejora = abrirTramoFiscal({
      desdePeriodo: '2028-01-01',
      causa: 'mejora',
      baseFiscalCentavos: 1500000,
      acumuladaCentavos: 500000,
      porcentaje: '10.00',
      baseDelPorcentajeCentavos: 1000000,
    });
    const posterior = abrirTramoFiscal({
      desdePeriodo: '2028-01-01',
      causa: 'costo_posterior',
      baseFiscalCentavos: 1500000,
      acumuladaCentavos: 500000,
      porcentaje: '10.00',
    });
    expect(mejora).toMatchObject({
      porDepreciarCentavos: 1000000,
      baseDelPorcentajeCentavos: 1000000,
      cuotaMensualCentavos: 8333,
    });
    expect(posterior).toMatchObject({
      porDepreciarCentavos: 1000000,
      baseDelPorcentajeCentavos: 1500000,
      cuotaMensualCentavos: 12500,
    });
  });
});
