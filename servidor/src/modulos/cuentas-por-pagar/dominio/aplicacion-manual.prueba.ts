import { describe, expect, it } from 'vitest';
import {
  exigirCargoDisponible,
  exigirFechaDeAplicacion,
  exigirLineasValidas,
  exigirMontosQueCaben,
  exigirNotaQueSeAplica,
  fechaMinimaDeAplicacion,
  proponerReparto,
  referenciaDelAcuerdo,
  superaElUmbralDeBancarizacion,
  type CargoConSaldoParaAplicar,
} from './aplicacion-manual.js';
import type { DocumentoPorPagar } from './documento-por-pagar.js';

const documento = (cambios: Partial<DocumentoPorPagar> = {}): DocumentoPorPagar => ({
  id: 'doc',
  origen: 'libro_de_compras',
  documentoId: 'libro',
  serie: 'A',
  numero: '1',
  tipo: 'factura',
  proveedorId: 'proveedor',
  documentoAfectadoId: null,
  fechaEmision: '2026-03-10',
  totalCentavos: 10000,
  retencionesCentavos: 0,
  saldoAlInicioCentavos: null,
  retencionesPorPracticarCentavos: null,
  referencia: null,
  tieneActivoFijo: false,
  vencimiento: '2026-04-10',
  estado: 'registrado',
  ingresadoPor: null,
  registradoEn: null,
  registradoPor: null,
  autorizadoEn: null,
  autorizadoPor: null,
  autorizacionPropia: false,
  ...cambios,
});

const codigoDe = (accion: () => void) => {
  try {
    accion();
  } catch (error) {
    return (error as { codigo: string }).codigo;
  }
  return null;
};

describe('exigirLineasValidas', () => {
  it('acepta montos positivos de cargos distintos', () => {
    expect(
      codigoDe(() =>
        exigirLineasValidas([
          { cargoId: 'a', montoCentavos: 1 },
          { cargoId: 'b', montoCentavos: 2 },
        ]),
      ),
    ).toBeNull();
  });

  it('rechaza un monto en cero y un cargo repetido', () => {
    expect(codigoDe(() => exigirLineasValidas([{ cargoId: 'a', montoCentavos: 0 }]))).toBe(
      'monto_de_aplicacion_invalido',
    );
    expect(
      codigoDe(() =>
        exigirLineasValidas([
          { cargoId: 'a', montoCentavos: 1 },
          { cargoId: 'a', montoCentavos: 1 },
        ]),
      ),
    ).toBe('cargo_repetido');
  });
});

describe('la nota y los cargos', () => {
  it('vale una nota pendiente, registrada o autorizada, y no una anulada ni una factura', () => {
    for (const estado of ['pendiente', 'registrado', 'autorizado'] as const) {
      expect(codigoDe(() => exigirNotaQueSeAplica(documento({ tipo: 'nota_de_credito', estado })))).toBeNull();
    }
    expect(codigoDe(() => exigirNotaQueSeAplica(documento({ tipo: 'nota_de_credito', estado: 'anulado' })))).toBe(
      'no_es_nota_con_saldo',
    );
    expect(codigoDe(() => exigirNotaQueSeAplica(documento()))).toBe('no_es_nota_con_saldo');
  });

  it('un cargo es del mismo proveedor, vigente y no es una nota de crédito (vale uno pendiente)', () => {
    const nota = documento({ tipo: 'nota_de_credito' });
    expect(codigoDe(() => exigirCargoDisponible(nota, documento({ estado: 'pendiente' }), 0))).toBeNull();
    expect(codigoDe(() => exigirCargoDisponible(nota, documento({ proveedorId: 'otro' }), 0))).toBe(
      'cargo_no_disponible',
    );
    expect(codigoDe(() => exigirCargoDisponible(nota, documento({ estado: 'anulado' }), 0))).toBe(
      'cargo_no_disponible',
    );
    expect(codigoDe(() => exigirCargoDisponible(nota, documento({ tipo: 'nota_de_credito' }), 0))).toBe(
      'cargo_no_disponible',
    );
  });
});

describe('exigirMontosQueCaben', () => {
  const nota = { documento: documento({ tipo: 'nota_de_credito' }), saldoLibreCentavos: 5000 };
  const cargos = new Map<string, CargoConSaldoParaAplicar>([
    ['a', { documento: documento(), saldoCentavos: 3000 }],
    ['b', { documento: documento(), saldoCentavos: 4000 }],
  ]);

  it('acepta montos dentro de cada saldo y de la suma libre', () => {
    const lineas = [
      { cargoId: 'a', montoCentavos: 3000 },
      { cargoId: 'b', montoCentavos: 2000 },
    ];
    expect(codigoDe(() => exigirMontosQueCaben(nota, cargos, lineas))).toBeNull();
  });

  it('rechaza más que el saldo del cargo, con el índice de la línea', () => {
    expect(codigoDe(() => exigirMontosQueCaben(nota, cargos, [{ cargoId: 'a', montoCentavos: 3001 }]))).toBe(
      'aplicacion_mayor_que_el_saldo',
    );
  });

  it('rechaza una suma mayor que el saldo libre de la nota', () => {
    const lineas = [
      { cargoId: 'a', montoCentavos: 3000 },
      { cargoId: 'b', montoCentavos: 2001 },
    ];
    expect(codigoDe(() => exigirMontosQueCaben(nota, cargos, lineas))).toBe('aplicacion_mayor_que_el_saldo_libre');
  });
});

describe('la fecha de la aplicación', () => {
  const origenes = { recepciones: ['2026-03-10', '2026-04-01'], fechaDeInicio: null };

  it('la mínima es la recepción más reciente', () => {
    expect(fechaMinimaDeAplicacion(origenes)).toBe('2026-04-01');
  });

  it('un saldo inicial pone como mínima la fecha de inicio', () => {
    expect(fechaMinimaDeAplicacion({ recepciones: ['2026-03-10', null], fechaDeInicio: '2026-05-01' })).toBe(
      '2026-05-01',
    );
  });

  it('nada la limita si no hay documentos con fecha', () => {
    expect(fechaMinimaDeAplicacion({ recepciones: [], fechaDeInicio: null })).toBeNull();
  });

  it('acepta desde la mínima hasta hoy, y rechaza la futura y la anterior', () => {
    expect(codigoDe(() => exigirFechaDeAplicacion('2026-04-01', '2026-06-01', origenes))).toBeNull();
    expect(codigoDe(() => exigirFechaDeAplicacion('2026-06-01', '2026-06-01', origenes))).toBeNull();
    expect(codigoDe(() => exigirFechaDeAplicacion('2026-06-02', '2026-06-01', origenes))).toBe(
      'fecha_de_aplicacion_invalida',
    );
    expect(codigoDe(() => exigirFechaDeAplicacion('2026-03-31', '2026-06-01', origenes))).toBe(
      'fecha_de_aplicacion_invalida',
    );
  });

  it('un saldo inicial anterior a la fecha de inicio se rechaza y uno posterior pasa', () => {
    const conInicio = { recepciones: [null, '2026-03-10'], fechaDeInicio: '2026-05-01' };
    expect(codigoDe(() => exigirFechaDeAplicacion('2026-04-30', '2026-06-01', conInicio))).toBe(
      'fecha_de_aplicacion_invalida',
    );
    expect(codigoDe(() => exigirFechaDeAplicacion('2026-05-01', '2026-06-01', conInicio))).toBeNull();
  });

  it('un saldo inicial sin fecha de inicio en la empresa se rechaza', () => {
    expect(
      codigoDe(() => exigirFechaDeAplicacion('2026-05-01', '2026-06-01', { recepciones: [null], fechaDeInicio: null })),
    ).toBe('fecha_de_aplicacion_invalida');
  });
});

describe('referenciaDelAcuerdo', () => {
  it('recorta, deja vacía como nula y rechaza más de 100 caracteres', () => {
    expect(referenciaDelAcuerdo('  Acuerdo 7 ')).toBe('Acuerdo 7');
    expect(referenciaDelAcuerdo('   ')).toBeNull();
    expect(referenciaDelAcuerdo(undefined)).toBeNull();
    expect(codigoDe(() => referenciaDelAcuerdo('x'.repeat(101)))).toBe('referencia_de_aplicacion_invalida');
  });
});

describe('proponerReparto', () => {
  const cargo = (
    id: string,
    extra: Partial<{
      saldoCentavos: number;
      autorizado: boolean;
      vencimiento: string | null;
      fechaEmision: string;
    }> = {},
  ) => ({
    id,
    saldoCentavos: 1000,
    autorizado: false,
    vencimiento: '2026-05-01',
    fechaEmision: '2026-04-01',
    ...extra,
  });

  it('ofrece primero los autorizados y dentro de cada grupo el que vence antes', () => {
    const propuesta = proponerReparto(10000, [
      cargo('tarde', { vencimiento: '2026-07-01' }),
      cargo('autorizado-tarde', { autorizado: true, vencimiento: '2026-08-01' }),
      cargo('pronto', { vencimiento: '2026-05-01' }),
      cargo('autorizado-pronto', { autorizado: true, vencimiento: '2026-06-01' }),
    ]);
    expect(propuesta.map(({ cargo: { id } }) => id)).toEqual([
      'autorizado-pronto',
      'autorizado-tarde',
      'pronto',
      'tarde',
    ]);
  });

  it('desempata por la emisión y deja sin vencimiento al final', () => {
    const propuesta = proponerReparto(0, [
      cargo('sin-vencimiento', { vencimiento: null }),
      cargo('nuevo', { fechaEmision: '2026-04-20' }),
      cargo('viejo', { fechaEmision: '2026-04-02' }),
    ]);
    expect(propuesta.map(({ cargo: { id } }) => id)).toEqual(['viejo', 'nuevo', 'sin-vencimiento']);
  });

  it('reparte el saldo libre en ese orden hasta agotarlo', () => {
    const propuesta = proponerReparto(1500, [cargo('b', { autorizado: false }), cargo('a', { autorizado: true })]);
    expect(propuesta.map(({ cargo: { id }, propuestoCentavos }) => [id, propuestoCentavos])).toEqual([
      ['a', 1000],
      ['b', 500],
    ]);
  });
});

describe('superaElUmbralDeBancarizacion', () => {
  it('desde el umbral inclusive', () => {
    expect(superaElUmbralDeBancarizacion(3000000, 3000000)).toBe(true);
    expect(superaElUmbralDeBancarizacion(2999999, 3000000)).toBe(false);
  });
});
