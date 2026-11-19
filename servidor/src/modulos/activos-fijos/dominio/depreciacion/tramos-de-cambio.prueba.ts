import { describe, expect, it } from 'vitest';
import { VidaUtilRestanteRequerida } from '../errores-de-mejora.js';
import { cuotasDelTramo } from './cuotas-del-tramo.js';
import {
  acumuladaAntesDe,
  desdeDelUltimoTramo,
  mesesQueFaltan,
  primerMesAbierto,
  vidaTotalContable,
  type EstadoDeLosLibros,
} from './estado-de-los-libros.js';
import { tramosDeInicioDeUso } from './inicio-de-uso.js';
import type { TramoGuardado } from './tramo.js';
import { tramosDeCambio, type EntradaDeCambio } from './tramos-de-cambio.js';

/** El pick-up del §7.5: Q250,000.00 en uso desde marzo de 2027, fiscal 20 %, contable 60 meses con residual Q25,000.00. */
function pickUp(ultimoMesCerrado: string | null = null, acumulada = { contable: 0, fiscal: 0 }): EstadoDeLosLibros {
  const { contable, fiscal } = tramosDeInicioDeUso({
    fechaDeInicioDeUso: '2027-03-10',
    primerMes: 'mes_de_inicio',
    costoCentavos: 25_000_000,
    baseFiscalCentavos: 25_000_000,
    porcentajeFiscal: '20.00',
    vidaUtilContableMeses: 60,
    valorResidualCentavos: 2_500_000,
  });
  const tramos: TramoGuardado[] = [
    { ...contable, id: 'c1' },
    { ...fiscal, id: 'f1' },
  ];
  return { tramos, depreciadoPorTramo: new Map(), acumuladaCentavos: acumulada, ultimoMesCerrado };
}

const cambio = (cambios: Partial<EntradaDeCambio> = {}): EntradaDeCambio => ({
  estado: pickUp(),
  causa: 'mejora',
  desdePeriodo: '2027-06-01',
  costoCentavos: 30_000_000,
  baseFiscalCentavos: 30_000_000,
  porcentajeFiscal: '20.00',
  valorResidualCentavos: 2_500_000,
  vidaRestanteMeses: null,
  ...cambios,
});

describe('el estado de los libros', () => {
  it('el primer mes abierto es el siguiente al último cerrado o, sin cierres, el del primer tramo', () => {
    expect(primerMesAbierto(pickUp())).toBe('2027-03-01');
    expect(primerMesAbierto(pickUp('2027-05-01'))).toBe('2027-06-01');
    expect(primerMesAbierto({ ...pickUp(), tramos: [] })).toBeNull();
  });

  it('el último tramo es el de mayor mes de los dos libros', () => {
    expect(desdeDelUltimoTramo(pickUp().tramos)).toBe('2027-03-01');
    expect(desdeDelUltimoTramo([])).toBeNull();
  });

  it('proyecta los meses abiertos que van antes del tramo nuevo con los tramos de hoy', () => {
    const estado = pickUp();

    expect(acumuladaAntesDe(estado, 'contable', '2027-06-01')).toBe(1_125_000);
    expect(acumuladaAntesDe(estado, 'fiscal', '2027-06-01')).toBe(1_250_001);
    expect(acumuladaAntesDe(estado, 'contable', '2027-03-01')).toBe(0);
  });

  it('con meses cerrados parte de lo cerrado y solo proyecta los abiertos', () => {
    const cerrado = pickUp('2027-04-01', { contable: 750_000, fiscal: 833_334 });
    const depreciado = new Map([
      ['c1', 750_000],
      ['f1', 833_334],
    ]);

    const estado = { ...cerrado, depreciadoPorTramo: depreciado };

    expect(acumuladaAntesDe(estado, 'contable', '2027-06-01')).toBe(1_125_000);
    expect(acumuladaAntesDe(estado, 'contable', '2027-05-01')).toBe(750_000);
  });

  it('los meses que faltan son los del tramo contable menos los que ya pasaron; agotado, ninguno', () => {
    const { tramos } = pickUp();

    expect(mesesQueFaltan(tramos, '2027-03-01')).toBe(60);
    expect(mesesQueFaltan(tramos, '2027-06-01')).toBe(57);
    expect(mesesQueFaltan(tramos, '2032-03-01')).toBeNull();
    expect(
      mesesQueFaltan(
        tramos.filter((t) => t.libro === 'fiscal'),
        '2027-06-01',
      ),
    ).toBeNull();
  });

  it('la vida total suma lo que pasó desde el primer tramo y lo que le queda', () => {
    expect(vidaTotalContable('2027-03-01', { desdePeriodo: '2027-06-01', meses: 57 })).toBe(60);
    expect(vidaTotalContable('2027-03-01', { desdePeriodo: '2027-06-01', meses: 120 })).toBe(123);
  });

  it('con el primer mes siguiente o un saldo inicial, cuenta desde el primer tramo y no desde el inicio de uso', () => {
    expect(vidaTotalContable('2027-04-01', { desdePeriodo: '2027-06-01', meses: 58 })).toBe(60);
    expect(vidaTotalContable('2027-06-01', { desdePeriodo: '2027-06-01', meses: 60 })).toBe(60);
  });
});

describe('mejora (V-3)', () => {
  it('el contable reparte el valor en libros menos el residual entre los meses que quedaban', () => {
    const { contable } = tramosDeCambio(cambio());

    expect(contable).toMatchObject({
      libro: 'contable',
      causa: 'mejora',
      desdePeriodo: '2027-06-01',
      meses: 57,
      porDepreciarCentavos: 26_375_000,
      cuotaMensualCentavos: 462_719,
    });
    expect(cuotasDelTramo(contable!).reduce((a, b) => a + b, 0)).toBe(26_375_000);
  });

  it('el fiscal aplica el porcentaje sobre el saldo no depreciado más la mejora (art. 26)', () => {
    const { fiscal } = tramosDeCambio(cambio());

    expect(fiscal).toMatchObject({
      libro: 'fiscal',
      causa: 'mejora',
      porDepreciarCentavos: 28_749_999,
      baseDelPorcentajeCentavos: 28_749_999,
      cuotaMensualCentavos: 479_167,
    });
  });

  it('con una vida nueva el contable la usa en vez de los meses que quedaban', () => {
    const { contable } = tramosDeCambio(cambio({ vidaRestanteMeses: 120 }));

    expect(contable).toMatchObject({ meses: 120, cuotaMensualCentavos: 219_792 });
  });

  it('con meses ya cerrados parte de lo cerrado y mantiene lo depreciado', () => {
    const estado = pickUp('2027-05-01', { contable: 1_125_000, fiscal: 1_250_001 });

    const { contable, fiscal } = tramosDeCambio(cambio({ estado, desdePeriodo: '2027-06-01' }));

    expect(contable!.porDepreciarCentavos).toBe(26_375_000);
    expect(fiscal!.porDepreciarCentavos).toBe(28_749_999);
  });
});

describe('costo posterior (V-3)', () => {
  it('el fiscal sigue el mismo porcentaje sobre la base total corregida, sin reiniciar la vida', () => {
    const { fiscal, contable } = tramosDeCambio(
      cambio({ causa: 'costo_posterior', costoCentavos: 25_300_000, baseFiscalCentavos: 25_300_000 }),
    );

    expect(fiscal).toMatchObject({
      causa: 'costo_posterior',
      baseDelPorcentajeCentavos: 25_300_000,
      cuotaMensualCentavos: 421_667,
    });
    expect(fiscal!.porDepreciarCentavos).toBe(25_300_000 - 1_250_001);
    expect(contable).toMatchObject({ causa: 'costo_posterior', meses: 57 });
  });

  it('una nota de crédito que deja el valor bajo el residual da exceso contable y cuota cero (V-6)', () => {
    const estado = pickUp('2027-05-01', { contable: 1_125_000, fiscal: 1_250_001 });

    const { contable, fiscal } = tramosDeCambio(
      cambio({ estado, causa: 'costo_posterior', costoCentavos: 3_000_000, baseFiscalCentavos: 1_000_000 }),
    );

    expect(contable).toMatchObject({
      porDepreciarCentavos: 0,
      cuotaMensualCentavos: 0,
      excesoDeNotaDeCreditoCentavos: 625_000,
    });
    expect(fiscal).toMatchObject({
      porDepreciarCentavos: 0,
      cuotaMensualCentavos: 0,
      excesoDeNotaDeCreditoCentavos: 250_001,
    });
  });

  it('si el valor en libros baja del residual, lo que sobra queda como exceso contable', () => {
    const estado = pickUp('2027-05-01', { contable: 1_125_000, fiscal: 1_250_001 });

    const { contable } = tramosDeCambio(cambio({ estado, causa: 'costo_posterior', costoCentavos: 2_500_000 }));

    expect(contable).toMatchObject({ porDepreciarCentavos: 0, excesoDeNotaDeCreditoCentavos: 1_125_000 });
  });

  it('un activo con la vida contable agotada pide cuántos meses le quedan', () => {
    const agotado = pickUp();

    expect(() =>
      tramosDeCambio(cambio({ estado: agotado, desdePeriodo: '2032-04-01', causa: 'costo_posterior' })),
    ).toThrow(VidaUtilRestanteRequerida);
  });
});

describe('revisión de la estimación y cambio de matrícula', () => {
  it('la revisión abre solo el tramo contable con la vida nueva y el residual nuevo', () => {
    const resultado = tramosDeCambio(
      cambio({
        causa: 'revision_de_estimacion',
        desdePeriodo: '2027-03-01',
        costoCentavos: 25_000_000,
        vidaRestanteMeses: 90,
        valorResidualCentavos: 5_000_000,
      }),
    );

    expect(resultado.fiscal).toBeNull();
    expect(resultado.contable).toMatchObject({
      causa: 'revision_de_estimacion',
      meses: 90,
      valorResidualCentavos: 5_000_000,
      porDepreciarCentavos: 20_000_000,
      cuotaMensualCentavos: 222_222,
    });
  });

  it('el cambio de matrícula abre solo el tramo fiscal con la base recalculada y el mismo porcentaje', () => {
    const resultado = tramosDeCambio(
      cambio({ causa: 'cambio_de_matricula', desdePeriodo: '2027-03-01', baseFiscalCentavos: 20_000_000 }),
    );

    expect(resultado.contable).toBeNull();
    expect(resultado.fiscal).toMatchObject({
      causa: 'cambio_de_matricula',
      porcentaje: '20.00',
      porDepreciarCentavos: 20_000_000,
      baseDelPorcentajeCentavos: 20_000_000,
      cuotaMensualCentavos: 333_333,
    });
  });
});
