import { describe, expect, it } from 'vitest';
import { diasEntre, sumarAnios, sumarDias, ultimoDiaDelMes } from './fechas-de-corte.js';
import {
  aniosDesdeElUltimoMovimiento,
  posiblementePrescrito,
  posiblePrescripcionDesde,
  tramoDePrescripcion,
} from './prescripcion-de-saldos.js';
import {
  diasVencidoAlCorte,
  fechaDeEfectoDelDocumento,
  fechaDeEfectoDelPago,
  naturalezaDelSaldo,
  porcentajeDelTramo,
  saldoDelCargoAlCorte,
  saldoLibreDeLaNotaAlCorte,
  tramoDeAntiguedad,
  vigenteAlCorte,
} from './saldo-al-corte.js';

describe('fechas de corte', () => {
  it('cuenta días, suma días y encuentra el último día del mes', () => {
    expect(diasEntre('2026-10-31', '2026-11-15')).toBe(15);
    expect(diasEntre('2026-11-15', '2026-10-31')).toBe(-15);
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(ultimoDiaDelMes(2028, 2)).toBe('2028-02-29');
    expect(ultimoDiaDelMes(2026, 12)).toBe('2026-12-31');
  });

  it('suma años y lleva el 29 de febrero al 28 si el año destino no es bisiesto', () => {
    expect(sumarAnios('2026-11-15', 5)).toBe('2031-11-15');
    expect(sumarAnios('2024-02-29', 5)).toBe('2029-02-28');
    expect(sumarAnios('2024-02-29', 4)).toBe('2028-02-29');
  });
});

describe('la fecha de efecto de un documento', () => {
  it('un saldo inicial cuenta desde su emisión', () => {
    expect(fechaDeEfectoDelDocumento({ origen: 'saldo_inicial', fechaEmision: '2026-09-01' }, '2026-10-01')).toBe(
      '2026-09-01',
    );
  });

  it('un documento del libro emitido antes de la fecha de inicio cuenta desde la fecha de inicio', () => {
    expect(fechaDeEfectoDelDocumento({ origen: 'libro_de_compras', fechaEmision: '2026-09-20' }, '2026-10-01')).toBe(
      '2026-10-01',
    );
  });

  it('uno del libro emitido desde la fecha de inicio, o sin fecha de inicio, cuenta desde su emisión', () => {
    expect(fechaDeEfectoDelDocumento({ origen: 'libro_de_compras', fechaEmision: '2026-10-01' }, '2026-10-01')).toBe(
      '2026-10-01',
    );
    expect(fechaDeEfectoDelDocumento({ origen: 'libro_de_compras', fechaEmision: '2026-10-20' }, '2026-10-01')).toBe(
      '2026-10-20',
    );
    expect(fechaDeEfectoDelDocumento({ origen: 'libro_de_compras', fechaEmision: '2026-01-05' }, null)).toBe(
      '2026-01-05',
    );
  });
});

describe('vigente al corte', () => {
  it('lo no anulado y lo anulado después del corte siguen vigentes; lo anulado hasta el corte, no', () => {
    expect(vigenteAlCorte(null, '2026-10-31')).toBe(true);
    expect(vigenteAlCorte('2026-11-02', '2026-10-31')).toBe(true);
    expect(vigenteAlCorte('2026-10-31', '2026-10-31')).toBe(false);
    expect(vigenteAlCorte('2026-10-15', '2026-10-31')).toBe(false);
  });
});

describe('la fecha de efecto de un pago', () => {
  it('es su fecha, salvo un cheque cobrado antes en una conciliación autorizada', () => {
    expect(fechaDeEfectoDelPago('2026-12-20', null)).toBe('2026-12-20');
    expect(fechaDeEfectoDelPago('2026-12-20', { anio: 2026, mes: 11 })).toBe('2026-11-30');
  });

  it('un cheque conciliado en el mes de su fecha, o después, conserva su fecha', () => {
    expect(fechaDeEfectoDelPago('2026-11-20', { anio: 2026, mes: 11 })).toBe('2026-11-20');
    expect(fechaDeEfectoDelPago('2026-11-20', { anio: 2026, mes: 12 })).toBe('2026-11-20');
  });
});

describe('el saldo al corte', () => {
  it('un cargo: su neto menos notas aplicadas, pagos que ya rebajan y ajustes', () => {
    expect(
      saldoDelCargoAlCorte({
        netoCentavos: 100_000,
        aplicadoCentavos: 10_000,
        pagadoCentavos: 30_000,
        ajustadoCentavos: 5,
      }),
    ).toBe(59_995);
  });

  it('una nota: su base menos lo aplicado, lo ajustado y lo reintegrado', () => {
    expect(
      saldoLibreDeLaNotaAlCorte({
        baseCentavos: 30_000,
        aplicadoCentavos: 10_000,
        ajustadoCentavos: 5_000,
        reintegradoCentavos: 2_500,
      }),
    ).toBe(12_500);
  });

  it('según su neto, un proveedor es acreedor, deudor o está en cero', () => {
    expect(naturalezaDelSaldo(1)).toBe('acreedor');
    expect(naturalezaDelSaldo(-1)).toBe('deudor');
    expect(naturalezaDelSaldo(0)).toBe('cero');
  });
});

describe('los tramos de antigüedad por «Vence»', () => {
  const tramo = (vencimiento: string | null) => tramoDeAntiguedad('2026-11-15', vencimiento);

  it('reparte por los días vencidos al corte', () => {
    expect(tramo('2026-11-20')).toBe('por_vencer');
    expect(tramo('2026-11-15')).toBe('por_vencer');
    expect(tramo('2026-11-14')).toBe('de_1_a_30');
    expect(tramo('2026-10-16')).toBe('de_1_a_30');
    expect(tramo('2026-10-15')).toBe('de_31_a_60');
    expect(tramo('2026-09-16')).toBe('de_31_a_60');
    expect(tramo('2026-09-15')).toBe('de_61_a_90');
    expect(tramo('2026-08-17')).toBe('de_61_a_90');
    expect(tramo('2026-08-16')).toBe('mas_de_90');
  });

  it('sin vencimiento va aparte', () => {
    expect(tramo(null)).toBe('sin_vencimiento');
    expect(diasVencidoAlCorte('2026-11-15', null)).toBeNull();
    expect(diasVencidoAlCorte('2026-11-15', '2026-11-10')).toBe(5);
  });

  it('el porcentaje de un tramo es sobre el total de cargos, con dos decimales', () => {
    expect(porcentajeDelTramo(2_500, 10_000)).toBe('25.00');
    expect(porcentajeDelTramo(1, 3)).toBe('33.33');
    expect(porcentajeDelTramo(10_000, 10_000)).toBe('100.00');
    expect(porcentajeDelTramo(5, 0)).toBe('0.00');
  });
});

describe('la prescripción de un saldo a favor', () => {
  it('es el último movimiento más cinco años, y cuenta los años cumplidos', () => {
    expect(posiblePrescripcionDesde('2021-11-15')).toBe('2026-11-15');
    expect(aniosDesdeElUltimoMovimiento('2021-11-15', '2026-11-14')).toBe(4);
    expect(aniosDesdeElUltimoMovimiento('2021-11-15', '2026-11-15')).toBe(5);
    expect(aniosDesdeElUltimoMovimiento('2026-11-15', '2026-11-15')).toBe(0);
  });

  it('se reparte en tramos de un año y se marca desde el quinto', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(tramoDePrescripcion)).toEqual([
      'menos_de_1',
      'de_1_a_2',
      'de_2_a_3',
      'de_3_a_4',
      'de_4_a_5',
      'de_5_o_mas',
      'de_5_o_mas',
    ]);
    expect(posiblementePrescrito('2021-11-15', '2026-11-14')).toBe(false);
    expect(posiblementePrescrito('2021-11-15', '2026-11-15')).toBe(true);
  });
});
