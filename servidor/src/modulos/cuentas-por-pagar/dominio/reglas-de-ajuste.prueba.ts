import { describe, expect, it } from 'vitest';
import { documentoSembrado } from '../pruebas/dobles-de-aplicaciones.js';
import { EFECTO_DE_LA_CAUSA } from './ajustes.js';
import { exigirFechaDeAjuste, exigirNotaQueSeAjusta, fechaMinimaDeAjuste, validarAjuste } from './reglas-de-ajuste.js';

const nota = documentoSembrado({ tipo: 'nota_de_credito', estado: 'registrado' });
const saldo = { documento: nota, saldoLibreCentavos: 10000 };
const datos = { montoCentavos: 5000, causa: 'no_recuperable', referencia: undefined };

describe('el efecto de cada causa', () => {
  it('las pérdidas van a gasto y la compensación es transitoria', () => {
    expect(EFECTO_DE_LA_CAUSA).toEqual({
      no_recuperable: 'perdida',
      diferencia_menor: 'perdida',
      compensado_con_otra_cuenta: 'transitoria',
    });
  });
});

describe('exigirNotaQueSeAjusta', () => {
  it('acepta registrada y autorizada; rechaza pendiente, anulada y lo que no es nota de crédito', () => {
    expect(() => exigirNotaQueSeAjusta({ ...nota, estado: 'autorizado' })).not.toThrow();
    expect(() => exigirNotaQueSeAjusta(nota)).not.toThrow();
    expect(() => exigirNotaQueSeAjusta({ ...nota, estado: 'pendiente' })).toThrow(/pendiente/);
    expect(() => exigirNotaQueSeAjusta({ ...nota, estado: 'anulado' })).toThrow(/no es una nota de crédito vigente/);
    expect(() => exigirNotaQueSeAjusta({ ...nota, tipo: 'factura' })).toThrow(/no es una nota de crédito vigente/);
  });
});

describe('validarAjuste', () => {
  it('devuelve los datos limpios; la referencia vacía es nula', () => {
    expect(validarAjuste(saldo, { ...datos, referencia: '  ' }, 2500)).toEqual({
      montoCentavos: 5000,
      causa: 'no_recuperable',
      referencia: null,
    });
  });

  it('el monto no pasa del saldo libre y es mayor que cero', () => {
    expect(() => validarAjuste(saldo, { ...datos, montoCentavos: 10000 }, 2500)).not.toThrow();
    expect(() => validarAjuste(saldo, { ...datos, montoCentavos: 10001 }, 2500)).toThrow(/solo tiene Q100\.00/);
    expect(() => validarAjuste(saldo, { ...datos, montoCentavos: 0 }, 2500)).toThrow(/mayor que cero/);
  });

  it('«Diferencia menor» llega hasta el tope inclusive y con tope cero no se usa', () => {
    const menor = { ...datos, causa: 'diferencia_menor', montoCentavos: 2500 };
    expect(() => validarAjuste(saldo, menor, 2500)).not.toThrow();
    expect(() => validarAjuste(saldo, { ...menor, montoCentavos: 2501 }, 2500)).toThrow(/hasta Q25\.00/);
    expect(() => validarAjuste(saldo, { ...menor, montoCentavos: 1 }, 0)).toThrow(/hasta Q0\.00/);
  });

  it('compensar con otra cuenta exige la referencia', () => {
    const compensar = { ...datos, causa: 'compensado_con_otra_cuenta' };
    expect(() => validarAjuste(saldo, compensar, 2500)).toThrow(/con qué se compensó/);
    expect(validarAjuste(saldo, { ...compensar, referencia: ' Recibo 1 ' }, 2500).referencia).toBe('Recibo 1');
  });

  it('rechaza una causa que no existe', () => {
    expect(() => validarAjuste(saldo, { ...datos, causa: 'otra' }, 2500)).toThrow(/causa/);
  });
});

describe('la fecha del ajuste', () => {
  it('la mínima es la recepción o, sin ella, la fecha de inicio', () => {
    expect(fechaMinimaDeAjuste('2026-03-10', '2026-01-01')).toBe('2026-03-10');
    expect(fechaMinimaDeAjuste(null, '2026-01-01')).toBe('2026-01-01');
    expect(fechaMinimaDeAjuste(null, null)).toBeNull();
  });

  it('no puede ser futura ni anterior a la mínima, y un saldo inicial sin fecha de inicio no se ajusta', () => {
    const origen = { recepcion: '2026-03-10', fechaDeInicio: null };
    expect(() => exigirFechaDeAjuste('2026-03-10', '2026-06-01', origen)).not.toThrow();
    expect(() => exigirFechaDeAjuste('2026-03-09', '2026-06-01', origen)).toThrow(/10\/03\/2026/);
    expect(() => exigirFechaDeAjuste('2026-06-02', '2026-06-01', origen)).toThrow(/futura/);
    expect(() => exigirFechaDeAjuste('2026-06-01', '2026-06-01', { recepcion: null, fechaDeInicio: null })).toThrow();
  });
});
