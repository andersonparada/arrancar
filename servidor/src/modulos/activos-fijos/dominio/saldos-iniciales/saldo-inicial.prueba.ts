import { describe, expect, it } from 'vitest';
import { cuotasDelTramo } from '../depreciacion/cuotas-del-tramo.js';
import { SaldoInicialInvalido } from '../errores-de-saldo-inicial.js';
import { fechaDeCorteDe, validarSaldoInicial, type DatosDeSaldoInicial } from './saldo-inicial.js';
import { tramosDeSaldoInicial } from './tramos-de-saldo-inicial.js';

/** El camión de 120,000 comprado en 2024: contable 50,000 depreciados y 36 meses por delante; fiscal al 20 %. */
const camion = (cambios: Partial<DatosDeSaldoInicial> = {}): DatosDeSaldoInicial => ({
  costoCentavos: 12_000_000,
  acumuladaContableCentavos: 5_000_000,
  costoFiscalCentavos: 12_000_000,
  baseFiscalCentavos: 12_000_000,
  acumuladaFiscalCentavos: 7_200_000,
  valorResidualCentavos: 0,
  porcentajeFiscal: '20.00',
  vidaUtilRestanteMeses: 36,
  ...cambios,
});

const reglas = { incisoFiscal: 'maquinaria_y_vehiculos', enConstruccion: false, porcentajeMaximo: 20 } as const;

describe('fechaDeCorteDe', () => {
  it('es el día anterior a la fecha de inicio, también al cruzar de mes o de año', () => {
    expect(fechaDeCorteDe('2026-03-15')).toBe('2026-03-14');
    expect(fechaDeCorteDe('2026-01-01')).toBe('2025-12-31');
    expect(fechaDeCorteDe('2024-03-01')).toBe('2024-02-29');
  });
});

describe('validarSaldoInicial', () => {
  it('acepta el caso normal y lo devuelve igual', () => {
    expect(validarSaldoInicial(camion(), reglas)).toEqual(camion());
  });

  it.each([
    ['un costo en cero', { costoCentavos: 0 }],
    ['una acumulada contable sobre el costo', { acumuladaContableCentavos: 12_000_001 }],
    ['una acumulada contable negativa', { acumuladaContableCentavos: -1 }],
    ['un residual sobre el costo', { valorResidualCentavos: 12_000_001 }],
    ['una base fiscal sobre el costo fiscal', { baseFiscalCentavos: 12_000_001 }],
    ['una acumulada fiscal sobre la base', { acumuladaFiscalCentavos: 12_000_001 }],
    ['un costo fiscal en cero', { costoFiscalCentavos: 0 }],
    ['un porcentaje sobre el máximo de ley', { porcentajeFiscal: '25.00' }],
    ['un porcentaje en cero', { porcentajeFiscal: '0.00' }],
    ['una vida restante de más de 1200 meses', { vidaUtilRestanteMeses: 1201 }],
    ['una vida restante que falta', { vidaUtilRestanteMeses: null }],
    ['una vida restante con decimales', { vidaUtilRestanteMeses: 12.5 }],
  ])('rechaza %s', (_caso, cambios) => {
    expect(() => validarSaldoInicial(camion(cambios), reglas)).toThrow(SaldoInicialInvalido);
  });

  it('acepta vida restante en cero (ya se agotó) y una base fiscal menor que el costo fiscal (tope del inmueble)', () => {
    expect(validarSaldoInicial(camion({ vidaUtilRestanteMeses: 0 }), reglas).vidaUtilRestanteMeses).toBe(0);
    const conTope = camion({ baseFiscalCentavos: 9_000_000, acumuladaFiscalCentavos: 3_000_000 });
    expect(validarSaldoInicial(conTope, reglas).baseFiscalCentavos).toBe(9_000_000);
  });

  it('un terreno no se deprecia: se normaliza sin base, acumulada, vida ni porcentaje, y rechaza depreciación acumulada', () => {
    const terreno = camion({ acumuladaContableCentavos: 0, acumuladaFiscalCentavos: 0 });

    const normalizado = validarSaldoInicial(terreno, { ...reglas, incisoFiscal: 'terrenos' });

    expect(normalizado).toMatchObject({ baseFiscalCentavos: 0, porcentajeFiscal: '0.00', vidaUtilRestanteMeses: null });
    expect(() => validarSaldoInicial(camion(), { ...reglas, incisoFiscal: 'terrenos' })).toThrow(SaldoInicialInvalido);
  });

  it('una obra en construcción entra sin depreciar: sin vida restante y con acumuladas en cero', () => {
    const obra = camion({ acumuladaContableCentavos: 0, acumuladaFiscalCentavos: 0 });

    const normalizada = validarSaldoInicial(obra, { ...reglas, enConstruccion: true });

    expect(normalizada).toMatchObject({ vidaUtilRestanteMeses: null, valorResidualCentavos: 0 });
    expect(() => validarSaldoInicial(camion(), { ...reglas, enConstruccion: true })).toThrow(SaldoInicialInvalido);
  });
});

describe('tramosDeSaldoInicial', () => {
  it('abre los dos tramos en el mes de la fecha de inicio con lo que falta por depreciar', () => {
    const tramos = tramosDeSaldoInicial({ fechaDeInicio: '2026-03-15', datos: camion() });

    const [contable, fiscal] = tramos;
    expect(contable).toMatchObject({
      libro: 'contable',
      causa: 'saldo_inicial',
      desdePeriodo: '2026-03-01',
      porDepreciarCentavos: 7_000_000,
      meses: 36,
      cuotaMensualCentavos: 194_444,
    });
    expect(fiscal).toMatchObject({
      libro: 'fiscal',
      causa: 'saldo_inicial',
      desdePeriodo: '2026-03-01',
      porDepreciarCentavos: 4_800_000,
      baseDelPorcentajeCentavos: 12_000_000,
      cuotaMensualCentavos: 200_000,
    });
  });

  it('las cuotas del tramo contable suman exactamente lo que falta (con el redondeo en el último mes)', () => {
    const [contable] = tramosDeSaldoInicial({ fechaDeInicio: '2026-01-01', datos: camion() });

    const cuotas = cuotasDelTramo(contable!);

    expect(cuotas).toHaveLength(36);
    expect(cuotas.reduce((suma, cuota) => suma + cuota, 0)).toBe(7_000_000);
  });

  it('el valor residual se descuenta de lo que falta en el libro contable', () => {
    const [contable] = tramosDeSaldoInicial({
      fechaDeInicio: '2026-01-01',
      datos: camion({ valorResidualCentavos: 1_000_000 }),
    });

    expect(contable).toMatchObject({ porDepreciarCentavos: 6_000_000, valorResidualCentavos: 1_000_000 });
  });

  it('sin vida restante no hay tramo contable, pero el fiscal sigue', () => {
    const tramos = tramosDeSaldoInicial({ fechaDeInicio: '2026-01-01', datos: camion({ vidaUtilRestanteMeses: 0 }) });

    expect(tramos.map((tramo) => tramo.libro)).toEqual(['fiscal']);
  });

  it('un activo ya depreciado del todo en el libro fiscal deja un tramo sin cuotas', () => {
    const [, fiscal] = tramosDeSaldoInicial({
      fechaDeInicio: '2026-01-01',
      datos: camion({ acumuladaFiscalCentavos: 12_000_000 }),
    });

    expect(fiscal).toMatchObject({ porDepreciarCentavos: 0, cuotaMensualCentavos: 0 });
  });
});
