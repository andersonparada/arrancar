import { describe, expect, it } from 'vitest';
import { mesesEntre, primerDiaDelMes } from './fechas-de-corte.js';
import { clasificarSaldoAFavor, totalesDeSaldosAFavor, type NotaAlCorte } from './saldos-a-favor.js';

function nota(cambios: Partial<NotaAlCorte>): NotaAlCorte {
  return {
    id: 'n1',
    proveedorId: 'p1',
    proveedorNombre: 'Alfa',
    proveedorNit: null,
    serie: null,
    numero: '1',
    fechaEmision: '2020-01-10',
    baseCentavos: 50_000,
    aplicadoCentavos: 0,
    ajustadoCentavos: 0,
    reintegradoCentavos: 0,
    saldoCentavos: 50_000,
    ultimoMovimiento: '2020-01-10',
    enContrasena: false,
    ...cambios,
  };
}

describe('clasificarSaldoAFavor', () => {
  it('cuenta los años cumplidos desde el último movimiento y da la fecha de posible prescripción a los cinco años', () => {
    const fila = clasificarSaldoAFavor(nota({ ultimoMovimiento: '2022-06-15' }), '2026-06-14');

    expect(fila).toMatchObject({
      aniosDesdeElUltimoMovimiento: 3,
      tramo: 'de_3_a_4',
      posiblePrescripcionDesde: '2027-06-15',
      posiblementePrescrito: false,
    });
  });

  it('el día de la fecha de posible prescripción ya está posiblemente prescrito', () => {
    const fila = clasificarSaldoAFavor(nota({ ultimoMovimiento: '2021-06-15' }), '2026-06-15');

    expect(fila).toMatchObject({ aniosDesdeElUltimoMovimiento: 5, tramo: 'de_5_o_mas', posiblementePrescrito: true });
  });
});

describe('totalesDeSaldosAFavor', () => {
  it('suma por tramo y deja aparte lo posiblemente prescrito', () => {
    const filas = [
      clasificarSaldoAFavor(nota({ saldoCentavos: 10_000, ultimoMovimiento: '2026-01-01' }), '2026-06-15'),
      clasificarSaldoAFavor(nota({ saldoCentavos: 20_000, ultimoMovimiento: '2024-01-01' }), '2026-06-15'),
      clasificarSaldoAFavor(nota({ saldoCentavos: 30_000, ultimoMovimiento: '2019-01-01' }), '2026-06-15'),
    ];

    const totales = totalesDeSaldosAFavor(filas);

    expect(totales).toMatchObject({
      totalCentavos: 60_000,
      posiblementePrescritoCentavos: 30_000,
      posiblementePrescritas: 1,
    });
    expect(totales.porTramo).toMatchObject({ menos_de_1: 10_000, de_2_a_3: 20_000, de_5_o_mas: 30_000 });
  });
});

describe('fechas del estado de cuenta', () => {
  it('cuenta los meses completos entre dos fechas', () => {
    expect(mesesEntre('2026-01-01', '2026-12-31')).toBe(11);
    expect(mesesEntre('2024-11-15', '2026-11-15')).toBe(24);
    expect(mesesEntre('2024-11-15', '2026-11-16')).toBe(24);
    expect(mesesEntre('2024-11-14', '2026-11-15')).toBe(24);
    expect(mesesEntre('2024-10-31', '2026-11-30')).toBe(24);
    expect(mesesEntre('2024-10-01', '2026-11-30')).toBe(25);
  });

  it('da el primer día del mes', () => {
    expect(primerDiaDelMes('2026-11-15')).toBe('2026-11-01');
  });
});
