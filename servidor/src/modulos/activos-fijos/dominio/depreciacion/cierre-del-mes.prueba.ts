import { describe, expect, it } from 'vitest';
import { calcularCierre, totalesDelCierre, type ActivoParaCerrar, type CuotaDelMes } from './cierre-del-mes.js';
import { cuotaDelTramoEnElMes, tramoQueRige } from './cuota-del-mes.js';
import { tramosDeInicioDeUso } from './inicio-de-uso.js';
import { mesesEntre, sumarMeses } from './meses.js';
import type { LibroDeDepreciacion, TramoGuardado } from './tramo.js';

/** La pick-up de §7.5: Q250,000.00, en uso el 10-mar-2027, contable 60 meses con residual de Q25,000.00, fiscal 20 %. */
function pickUp(cambios: Partial<ActivoParaCerrar> = {}): ActivoParaCerrar {
  const { contable, fiscal } = tramosDeInicioDeUso({
    fechaDeInicioDeUso: '2027-03-10',
    primerMes: 'mes_de_inicio',
    costoCentavos: 25000000,
    baseFiscalCentavos: 25000000,
    porcentajeFiscal: '20.00',
    vidaUtilContableMeses: 60,
    valorResidualCentavos: 2500000,
  });
  return {
    activoId: 'activo-1',
    codigo: 'AF-0001',
    claseId: 'clase-1',
    incisoFiscal: 'maquinaria_y_vehiculos',
    localidadId: null,
    departamentoId: null,
    ocioso: false,
    tramos: [
      { ...contable, id: 'tramo-contable' },
      { ...fiscal, id: 'tramo-fiscal' },
    ],
    depreciadoPorTramo: new Map(),
    acumuladaCentavos: { contable: 0, fiscal: 0 },
    ...cambios,
  };
}

/**
 * Cierra `cantidad` meses seguidos desde `desde`, como lo hace el sistema: cada cierre lee lo ya depreciado de cada
 * tramo y la acumulada de lo que cerraron los anteriores.
 */
function cerrarMeses(base: ActivoParaCerrar, desde: string, cantidad: number): Map<string, CuotaDelMes[]> {
  const depreciado = new Map(base.depreciadoPorTramo);
  const acumulada = { ...base.acumuladaCentavos };
  const porMes = new Map<string, CuotaDelMes[]>();
  for (let i = 0; i < cantidad; i++) {
    const periodo = sumarMeses(desde, i);
    const { cuotas } = calcularCierre(periodo, [
      { ...base, depreciadoPorTramo: new Map(depreciado), acumuladaCentavos: { ...acumulada } },
    ]);
    for (const cuota of cuotas) {
      depreciado.set(cuota.tramoId, (depreciado.get(cuota.tramoId) ?? 0) + cuota.montoCentavos);
      acumulada[cuota.libro] = cuota.acumuladaCentavos;
    }
    porMes.set(periodo, cuotas);
  }
  return porMes;
}

const montosDe = (porMes: Map<string, CuotaDelMes[]>, libro: LibroDeDepreciacion): number[] =>
  [...porMes.values()].flatMap((cuotas) => cuotas.filter((cuota) => cuota.libro === libro).map((c) => c.montoCentavos));

describe('cuota del mes de un tramo', () => {
  it('el tramo que rige es el de mayor desde que no pase del mes', () => {
    const tramos = [{ desdePeriodo: '2027-03-01' }, { desdePeriodo: '2027-08-01' }, { desdePeriodo: '2028-01-01' }];

    expect(tramoQueRige(tramos, '2027-02-01')).toBeUndefined();
    expect(tramoQueRige(tramos, '2027-07-01')?.desdePeriodo).toBe('2027-03-01');
    expect(tramoQueRige(tramos, '2027-08-01')?.desdePeriodo).toBe('2027-08-01');
    expect(tramoQueRige(tramos, '2030-01-01')?.desdePeriodo).toBe('2028-01-01');
  });

  it('cuenta los meses entre dos períodos', () => {
    expect(mesesEntre('2027-03-01', '2027-03-01')).toBe(0);
    expect(mesesEntre('2027-03-01', '2028-02-01')).toBe(11);
    expect(mesesEntre('2027-03-01', '2027-01-01')).toBe(-2);
  });

  it('no da cuota antes de que empiece el tramo ni cuando ya se agotó', () => {
    const [contable] = pickUp().tramos;
    const tramo = contable!;

    expect(cuotaDelTramoEnElMes({ tramo, periodo: '2027-02-01', depreciadoDelTramoCentavos: 0 })).toBe(0);
    expect(cuotaDelTramoEnElMes({ tramo, periodo: '2027-03-01', depreciadoDelTramoCentavos: 0 })).toBe(375000);
    expect(cuotaDelTramoEnElMes({ tramo, periodo: '2032-03-01', depreciadoDelTramoCentavos: 22500000 })).toBe(0);
  });
});

describe('cierre del mes (ejemplo de §7.5)', () => {
  const sesentaMeses = cerrarMeses(pickUp(), '2027-03-01', 62);

  it('el contable da Q3,750.00 por mes de mar-2027 a feb-2032 y nada después', () => {
    const contables = montosDe(sesentaMeses, 'contable');

    expect(contables).toHaveLength(60);
    expect(new Set(contables)).toEqual(new Set([375000]));
    expect(sesentaMeses.get('2032-02-01')).toHaveLength(2);
    expect(sesentaMeses.get('2032-03-01')).toHaveLength(0);
  });

  it('el fiscal da 59 cuotas de Q4,166.67 y la 60.ª de Q4,166.47: en total, el costo', () => {
    const fiscales = montosDe(sesentaMeses, 'fiscal');

    expect(fiscales).toHaveLength(60);
    expect(fiscales.slice(0, 59).every((monto) => monto === 416667)).toBe(true);
    expect(fiscales[59]).toBe(416647);
    expect(fiscales.reduce((a, b) => a + b, 0)).toBe(25000000);
  });

  it('la acumulada crece con cada cuota y en dic-2027 la diferencia temporaria es Q4,166.70', () => {
    const diciembre = sesentaMeses.get('2027-12-01')!;
    const acumulada = (libro: LibroDeDepreciacion) => diciembre.find((c) => c.libro === libro)!.acumuladaCentavos;

    expect(acumulada('contable')).toBe(3750000);
    expect(acumulada('fiscal')).toBe(4166670);
    expect(acumulada('fiscal') - acumulada('contable')).toBe(416670);
  });

  it('calcular dos veces el mismo mes da exactamente lo mismo (no depende de nada oculto)', () => {
    const activo = pickUp();

    expect(calcularCierre('2027-03-01', [activo])).toEqual(calcularCierre('2027-03-01', [activo]));
  });

  it('el centro de costo y el activo ocioso pasan a la cuota; el ocioso sigue acumulando (V-4)', () => {
    const ocioso = pickUp({ localidadId: 'finca', departamentoId: 'taller', ocioso: true });

    const { cuotas } = calcularCierre('2027-03-01', [ocioso]);

    expect(cuotas).toHaveLength(2);
    expect(cuotas.every((cuota) => cuota.ocioso && cuota.localidadId === 'finca')).toBe(true);
    expect(cuotas.find((cuota) => cuota.libro === 'fiscal')?.acumuladaCentavos).toBe(416667);
  });
});

describe('cierre con varios activos y tramos', () => {
  it('un mes sin tramo vigente (todavía no empieza) no da cuotas ni cuenta al activo', () => {
    const { cuotas } = calcularCierre('2027-02-01', [pickUp()]);

    expect(cuotas).toEqual([]);
    expect(totalesDelCierre(cuotas)).toEqual({ contableCentavos: 0, fiscalCentavos: 0, activosDepreciados: 0 });
  });

  it('suma los totales de cada libro y cuenta los activos depreciados una sola vez', () => {
    const otro = pickUp({ activoId: 'activo-2', codigo: 'AF-0002' });

    const { cuotas } = calcularCierre('2027-03-01', [pickUp(), otro]);

    expect(totalesDelCierre(cuotas)).toEqual({
      contableCentavos: 750000,
      fiscalCentavos: 833334,
      activosDepreciados: 2,
    });
  });

  it('un tramo nuevo (mejora) rige desde su mes y el anterior deja de dar cuota', () => {
    const base = pickUp();
    const mejora: TramoGuardado = {
      ...base.tramos[0]!,
      id: 'tramo-mejora',
      desdePeriodo: '2027-06-01',
      causa: 'mejora',
      porDepreciarCentavos: 1200000,
      valorResidualCentavos: 0,
      meses: 12,
      cuotaMensualCentavos: 100000,
    };
    const activo = pickUp({ tramos: [...base.tramos, mejora] });

    const mayo = calcularCierre('2027-05-01', [activo]).cuotas.find((cuota) => cuota.libro === 'contable');
    const junio = calcularCierre('2027-06-01', [activo]).cuotas.find((cuota) => cuota.libro === 'contable');

    expect(mayo).toMatchObject({ tramoId: 'tramo-contable', montoCentavos: 375000 });
    expect(junio).toMatchObject({ tramoId: 'tramo-mejora', montoCentavos: 100000 });
  });

  it('informa el exceso de una nota de crédito solo en el mes en que abre el tramo', () => {
    const base = pickUp();
    const conExceso: TramoGuardado = {
      ...base.tramos[1]!,
      id: 'tramo-exceso',
      desdePeriodo: '2027-06-01',
      causa: 'costo_posterior',
      porDepreciarCentavos: 0,
      cuotaMensualCentavos: 0,
      excesoDeNotaDeCreditoCentavos: 50000,
    };
    const activo = pickUp({ tramos: [...base.tramos, conExceso] });

    expect(calcularCierre('2027-06-01', [activo]).excesos).toEqual([
      { activoId: 'activo-1', codigo: 'AF-0001', libro: 'fiscal', montoCentavos: 50000 },
    ]);
    expect(calcularCierre('2027-07-01', [activo]).excesos).toEqual([]);
    expect(calcularCierre('2027-06-01', [activo]).cuotas.filter((cuota) => cuota.libro === 'fiscal')).toEqual([]);
  });
});
