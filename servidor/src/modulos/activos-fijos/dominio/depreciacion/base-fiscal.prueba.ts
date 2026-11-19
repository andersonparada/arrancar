import { describe, expect, it } from 'vitest';
import {
  baseFiscal,
  costoFiscal,
  topeDelInmueble,
  type CostoParaLaBase,
  type ValoresDelInmueble,
} from './base-fiscal.js';
import { proponerParametrosDeUso, validarParametrosDeUso } from './parametros-de-uso.js';
import { ParametrosDeUsoInvalidos } from '../errores-de-depreciacion.js';

const costo = (montoCentavos: number, cambios: Partial<CostoParaLaBase> = {}): CostoParaLaBase => ({
  montoCentavos,
  aplicaAlLibroFiscal: true,
  noEsEdificacion: false,
  ...cambios,
});
const sinValores: ValoresDelInmueble = {
  valorDeMatricula: null,
  valorCatastral: null,
  valoresDelInmuebleCompleto: false,
};
const inmueble = (cambios: Partial<ValoresDelInmueble>): ValoresDelInmueble => ({ ...sinValores, ...cambios });

describe('tope fiscal del inmueble (§3.5.1)', () => {
  it('el tope es el mayor de la matrícula y el catastro', () => {
    expect(topeDelInmueble(inmueble({ valorDeMatricula: '1000000.00', valorCatastral: '1200000.00' }))).toBe(120000000);
    expect(topeDelInmueble(inmueble({ valorDeMatricula: '900000.00' }))).toBe(90000000);
    expect(topeDelInmueble(sinValores)).toBeNull();
  });

  it('si los valores son del inmueble completo, el tope es el 70 % del mayor', () => {
    const completo = inmueble({
      valorDeMatricula: '1000000.00',
      valorCatastral: '1200000.00',
      valoresDelInmuebleCompleto: true,
    });
    expect(topeDelInmueble(completo)).toBe(84000000);
  });

  it('la edificación se topa y lo que no es edificación suma aparte', () => {
    const costos = [costo(150000000), costo(10000000, { noEsEdificacion: true })];
    const base = (valores: ValoresDelInmueble) =>
      baseFiscal({ incisoFiscal: 'edificios', costos, inmueble: valores, valorComoGanadoComunCentavos: 0 });

    expect(base(inmueble({ valorDeMatricula: '1000000.00', valorCatastral: '1200000.00' }))).toBe(130000000);
    expect(
      base(
        inmueble({ valorDeMatricula: '1000000.00', valorCatastral: '1200000.00', valoresDelInmuebleCompleto: true }),
      ),
    ).toBe(94000000);
    expect(base(sinValores)).toBe(160000000);
  });

  it('con la edificación por debajo del tope no se recorta; el costo fiscal no lleva tope', () => {
    const costos = [costo(50000000), costo(7000000, { aplicaAlLibroFiscal: false })];
    const base = baseFiscal({
      incisoFiscal: 'edificios',
      costos,
      inmueble: inmueble({ valorCatastral: '1200000.00' }),
      valorComoGanadoComunCentavos: 0,
    });
    expect(base).toBe(50000000);
    expect(costoFiscal(costos)).toBe(50000000);
  });

  it('el costo fiscal no resta el tope aunque la base sí', () => {
    const costos = [costo(150000000)];
    const valores = inmueble({ valorDeMatricula: '1000000.00' });
    expect(baseFiscal({ incisoFiscal: 'edificios', costos, inmueble: valores, valorComoGanadoComunCentavos: 0 })).toBe(
      100000000,
    );
    expect(costoFiscal(costos)).toBe(150000000);
  });
});

describe('base fiscal de los demás incisos', () => {
  it('solo suman los costos que aplican al libro fiscal; una nota de crédito resta', () => {
    const costos = [costo(1000000), costo(-100000), costo(50000, { aplicaAlLibroFiscal: false })];
    const base = baseFiscal({
      incisoFiscal: 'maquinaria_y_vehiculos',
      costos,
      inmueble: sinValores,
      valorComoGanadoComunCentavos: 0,
    });
    expect(base).toBe(900000);
  });

  it('en un reproductor se resta el valor como ganado común (art. 28, inciso 7)', () => {
    const base = baseFiscal({
      incisoFiscal: 'reproductores',
      costos: [costo(2000000)],
      inmueble: sinValores,
      valorComoGanadoComunCentavos: 800000,
    });
    expect(base).toBe(1200000);
  });

  it('nunca es negativa', () => {
    const base = baseFiscal({
      incisoFiscal: 'reproductores',
      costos: [costo(100)],
      inmueble: sinValores,
      valorComoGanadoComunCentavos: 800,
    });
    expect(base).toBe(0);
  });
});

describe('parámetros de uso propuestos por la clase', () => {
  const clase = {
    incisoFiscal: 'maquinaria_y_vehiculos' as const,
    porcentajeFiscal: '20.00',
    vidaUtilContableMeses: null,
    valorResidualPorcentaje: '10.00',
  };

  it('sin vida útil de la clase, usa los meses que equivalen al porcentaje fiscal', () => {
    const propuesta = proponerParametrosDeUso({ clase, costoCentavos: 25000000, valorComoGanadoComunCentavos: null });
    expect(propuesta).toEqual({ porcentajeFiscal: '20.00', vidaUtilContableMeses: 60, valorResidualCentavos: 2500000 });
  });

  it('con vida útil de la clase usa esa; los reproductores toman el ganado común como residual (V-9)', () => {
    const propuesta = proponerParametrosDeUso({
      clase: { ...clase, incisoFiscal: 'reproductores', vidaUtilContableMeses: 48 },
      costoCentavos: 2000000,
      valorComoGanadoComunCentavos: 800000,
    });
    expect(propuesta).toMatchObject({ vidaUtilContableMeses: 48, valorResidualCentavos: 800000 });
  });

  it('los terrenos no llevan vida útil ni residual', () => {
    const propuesta = proponerParametrosDeUso({
      clase: { ...clase, incisoFiscal: 'terrenos', porcentajeFiscal: '0.00' },
      costoCentavos: 5000000,
      valorComoGanadoComunCentavos: null,
    });
    expect(propuesta).toEqual({ porcentajeFiscal: '0.00', vidaUtilContableMeses: null, valorResidualCentavos: 0 });
  });

  it('valida el máximo de ley, la vida y el residual', () => {
    const base = { incisoFiscal: 'maquinaria_y_vehiculos' as const, porcentajeMaximo: 20, costoCentavos: 1000 };
    const parametros = { porcentajeFiscal: '20.00', vidaUtilContableMeses: 60, valorResidualCentavos: 100 };
    const validar = (cambios: Partial<typeof parametros>) => () =>
      validarParametrosDeUso({ ...base, parametros: { ...parametros, ...cambios } });

    expect(validar({})).not.toThrow();
    expect(validar({ porcentajeFiscal: '20.01' })).toThrow(ParametrosDeUsoInvalidos);
    expect(validar({ porcentajeFiscal: '0.00' })).toThrow(ParametrosDeUsoInvalidos);
    expect(validar({ vidaUtilContableMeses: 1201 })).toThrow(ParametrosDeUsoInvalidos);
    expect(validar({ vidaUtilContableMeses: null as unknown as number })).toThrow(ParametrosDeUsoInvalidos);
    expect(validar({ valorResidualCentavos: 1001 })).toThrow(ParametrosDeUsoInvalidos);
  });
});
