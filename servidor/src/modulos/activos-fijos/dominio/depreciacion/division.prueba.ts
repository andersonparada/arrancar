import { describe, expect, it } from 'vitest';
import { cuotaDelTramoEnElMes } from './cuota-del-mes.js';
import { proporcion, repartirCifras, tramosDeUnaParte, type CifrasDeDivision } from './division.js';
import { sumarMeses } from './meses.js';
import type { TramoCalculado } from './tramo.js';

/** El ejemplo de §7.6: 50 sillas de Q15,000.00, fiscal 20 %, contable 60 meses sin residual, cerrado jun-2027. */
const SILLAS: CifrasDeDivision = {
  costoQueAplicaCentavos: 1_500_000,
  costoQueNoAplicaCentavos: 0,
  acumuladaContableCentavos: 150_000,
  acumuladaFiscalCentavos: 150_000,
  valorResidualCentavos: 0,
  baseFiscalCentavos: 1_500_000,
  baseDelPorcentajeCentavos: 1_500_000,
};

const JULIO = '2027-07-01';

describe('proporcion', () => {
  it('redondea la mitad hacia arriba', () => {
    expect(proporcion(5, { separadas: 1, original: 2 })).toBe(3);
    expect(proporcion(1_000, { separadas: 1, original: 3 })).toBe(333);
    expect(proporcion(2_000, { separadas: 1, original: 3 })).toBe(667);
  });

  it('un monto negativo se redondea por su valor absoluto', () => {
    expect(proporcion(-5, { separadas: 1, original: 2 })).toBe(-3);
  });
});

describe('repartirCifras (§7.6)', () => {
  it('reparte el ejemplo de las 50 sillas: 20 se llevan 6,000.00 con 600.00 depreciados', () => {
    const { nuevo, origen } = repartirCifras(SILLAS, { separadas: 20, original: 50 });

    expect(nuevo).toMatchObject({ costoQueAplicaCentavos: 600_000, acumuladaContableCentavos: 60_000 });
    expect(nuevo).toMatchObject({ acumuladaFiscalCentavos: 60_000, baseFiscalCentavos: 600_000 });
    expect(origen).toMatchObject({ costoQueAplicaCentavos: 900_000, acumuladaContableCentavos: 90_000 });
    expect(origen.baseDelPorcentajeCentavos).toBe(900_000);
  });

  it('el sobrante del redondeo queda en el origen y lo repartido siempre suma lo que había', () => {
    const cifras = {
      ...SILLAS,
      costoQueAplicaCentavos: 100_001,
      valorResidualCentavos: 7,
      costoQueNoAplicaCentavos: 5,
    };

    const { nuevo, origen } = repartirCifras(cifras, { separadas: 1, original: 3 });

    expect(nuevo.costoQueAplicaCentavos).toBe(33_334);
    expect(origen.costoQueAplicaCentavos).toBe(66_667);
    expect(nuevo.valorResidualCentavos + origen.valorResidualCentavos).toBe(7);
    expect(nuevo.costoQueNoAplicaCentavos + origen.costoQueNoAplicaCentavos).toBe(5);
  });

  it('sin tramo fiscal no inventa la base del porcentaje', () => {
    const { nuevo, origen } = repartirCifras(
      { ...SILLAS, baseDelPorcentajeCentavos: null },
      { separadas: 1, original: 2 },
    );

    expect([nuevo.baseDelPorcentajeCentavos, origen.baseDelPorcentajeCentavos]).toEqual([null, null]);
  });

  it.each([
    [0, 5],
    [5, 5],
    [6, 5],
    [1.5, 5],
  ])('no admite separar %s de %s', (separadas, original) => {
    expect(() => repartirCifras(SILLAS, { separadas, original })).toThrow(RangeError);
  });
});

describe('tramosDeUnaParte (§7.6)', () => {
  const MESES_QUE_FALTAN = 54;

  it('el activo nuevo: contable (6,000.00 − 600.00) / 54 = 100.00 y fiscal 6,000.00 × 20 / 1200 = 100.00', () => {
    const { nuevo } = repartirCifras(SILLAS, { separadas: 20, original: 50 });

    const tramos = tramosDeUnaParte({
      desdePeriodo: JULIO,
      cifras: nuevo,
      porcentajeFiscal: '20.00',
      mesesQueFaltan: MESES_QUE_FALTAN,
    });

    expect(tramos.contable).toMatchObject({
      causa: 'division',
      porDepreciarCentavos: 540_000,
      cuotaMensualCentavos: 10_000,
    });
    expect(tramos.fiscal).toMatchObject({
      causa: 'division',
      porDepreciarCentavos: 540_000,
      cuotaMensualCentavos: 10_000,
    });
  });

  it('el origen se queda con 9,000.00 y cuotas de 150.00: la suma por mes sigue en 250.00', () => {
    const { nuevo, origen } = repartirCifras(SILLAS, { separadas: 20, original: 50 });
    const parte = (cifras: CifrasDeDivision) =>
      tramosDeUnaParte({ desdePeriodo: JULIO, cifras, porcentajeFiscal: '20.00', mesesQueFaltan: MESES_QUE_FALTAN });

    const deOrigen = parte(origen);

    expect(deOrigen.contable?.cuotaMensualCentavos).toBe(15_000);
    expect(deOrigen.fiscal.cuotaMensualCentavos).toBe(15_000);
    expect(deOrigen.contable!.cuotaMensualCentavos + parte(nuevo).contable!.cuotaMensualCentavos).toBe(25_000);
  });

  it('sin meses que faltar no hay tramo contable, pero el fiscal sigue', () => {
    const tramos = tramosDeUnaParte({
      desdePeriodo: JULIO,
      cifras: SILLAS,
      porcentajeFiscal: '20.00',
      mesesQueFaltan: null,
    });

    expect(tramos.contable).toBeNull();
    expect(tramos.fiscal.libro).toBe('fiscal');
  });
});

/** Lo que un tramo depreciaría en `meses` meses, mes a mes, como lo hace el cierre. */
function depreciarTodo(tramo: TramoCalculado, meses: number): number {
  let depreciado = 0;
  for (let mes = 0; mes < meses; mes++)
    depreciado += cuotaDelTramoEnElMes({
      tramo,
      periodo: sumarMeses(tramo.desdePeriodo, mes),
      depreciadoDelTramoCentavos: depreciado,
    });
  return depreciado;
}

describe('50 divisiones de 1 (R-2 y R-13)', () => {
  /** Separa una pieza a la vez del origen, 49 veces, como lo hace «Separar en unidades». */
  function cincuentaPiezas(cifras: CifrasDeDivision): CifrasDeDivision[] {
    const partes: CifrasDeDivision[] = [];
    let origen = cifras;
    for (let restantes = 50; restantes > 1; restantes--) {
      const reparto = repartirCifras(origen, { separadas: 1, original: restantes });
      partes.push(reparto.nuevo);
      origen = reparto.origen;
    }
    return [...partes, origen];
  }

  const tramosDe = (cifras: CifrasDeDivision) =>
    tramosDeUnaParte({ desdePeriodo: JULIO, cifras, porcentajeFiscal: '20.00', mesesQueFaltan: 54 });

  it('no pierde ni inventa un centavo en el costo, lo acumulado ni la base', () => {
    const piezas = cincuentaPiezas({ ...SILLAS, costoQueAplicaCentavos: 1_500_001, baseFiscalCentavos: 1_500_001 });

    const suma = (campo: keyof CifrasDeDivision) => piezas.reduce((total, p) => total + (p[campo] ?? 0), 0);

    expect(suma('costoQueAplicaCentavos')).toBe(1_500_001);
    expect(suma('acumuladaContableCentavos')).toBe(150_000);
    expect(suma('baseFiscalCentavos')).toBe(1_500_001);
    expect(piezas).toHaveLength(50);
  });

  it('la última cuota de cada pieza absorbe el pendiente: el contable termina exacto en los 54 meses', () => {
    const piezas = cincuentaPiezas({ ...SILLAS, costoQueAplicaCentavos: 1_500_001, baseFiscalCentavos: 1_500_001 });

    const depreciado = piezas.map((pieza) => {
      const contable = tramosDe(pieza).contable!;
      return { contable, total: depreciarTodo(contable, 54) };
    });

    for (const { contable, total } of depreciado) expect(total).toBe(contable.porDepreciarCentavos);
    expect(depreciado.reduce((suma, { total }) => suma + total, 0)).toBe(1_500_001 - 150_000);
  });

  it('el fiscal agota lo que falta de cada pieza sin pasarse', () => {
    const piezas = cincuentaPiezas(SILLAS);

    const totales = piezas.map((pieza) => ({ fiscal: tramosDe(pieza).fiscal, total: 0 }));
    for (const item of totales) item.total = depreciarTodo(item.fiscal, 120);

    for (const { fiscal, total } of totales) expect(total).toBe(fiscal.porDepreciarCentavos);
    expect(totales.reduce((suma, { total }) => suma + total, 0)).toBe(1_500_000 - 150_000);
  });
});
