import { describe, expect, it } from 'vitest';
import {
  conceptosDelReintegro,
  exigirFechaDeReintegro,
  exigirMedioDeCobro,
  exigirNotasValidas,
  notasEnCentavos,
} from './registro-de-reintegro.js';
import { fechaDeAnulacionDelPago } from './anulacion-de-pagos.js';
import { efectoDelReintegro } from './reintegros.js';

describe('notas del reintegro', () => {
  it('pasa el dinero a centavos y exige de 1 a 100 notas sin repetir y con monto positivo', () => {
    const notas = notasEnCentavos([{ notaId: 'a', monto: '10.50' }]);

    expect(notas).toEqual([{ notaId: 'a', montoCentavos: 1050 }]);
    expect(() => exigirNotasValidas(notas)).not.toThrow();
    expect(() => exigirNotasValidas([])).toThrow(/al menos una nota/);
    expect(() => exigirNotasValidas([{ notaId: 'a', montoCentavos: 0 }])).toThrow(/mayor que cero/);
    expect(() => exigirNotasValidas([...notas, ...notas])).toThrow(/dos veces/);
    const muchas = Array.from({ length: 101 }, (_, i) => ({ notaId: String(i), montoCentavos: 1 }));
    expect(() => exigirNotasValidas(muchas)).toThrow(/hasta 100/);
  });
});

describe('medio de cobro', () => {
  it('el depósito pide cuenta y el efectivo pide la referencia del recibo', () => {
    expect(() => exigirMedioDeCobro({ forma: 'deposito' })).toThrow(/cuenta bancaria/);
    expect(() => exigirMedioDeCobro({ forma: 'efectivo', referencia: '  ' })).toThrow(/recibo de caja/);
    expect(exigirMedioDeCobro({ forma: 'efectivo', referencia: ' RC-1 ' })).toBe('RC-1');
    expect(exigirMedioDeCobro({ forma: 'deposito', cuentaBancariaId: 'c' })).toBeNull();
    expect(() => exigirMedioDeCobro({ forma: 'efectivo', referencia: 'x'.repeat(101) })).toThrow(/100/);
  });
});

describe('fecha del reintegro', () => {
  const origenes = { recepciones: ['2026-03-10'], fechaDeInicio: null };

  it('no es futura ni anterior a la recepción', () => {
    expect(() => exigirFechaDeReintegro('2026-03-10', '2026-03-12', origenes)).not.toThrow();
    expect(() => exigirFechaDeReintegro('2026-03-13', '2026-03-12', origenes)).toThrow(/futura/);
    expect(() => exigirFechaDeReintegro('2026-03-09', '2026-03-12', origenes)).toThrow(/10\/03\/2026/);
  });

  it('un saldo inicial usa la fecha de inicio y, sin ella, se rechaza', () => {
    expect(() =>
      exigirFechaDeReintegro('2026-03-01', '2026-03-12', { recepciones: [null], fechaDeInicio: '2026-03-01' }),
    ).not.toThrow();
    expect(() =>
      exigirFechaDeReintegro('2026-03-01', '2026-03-12', { recepciones: [null], fechaDeInicio: null }),
    ).toThrow();
  });
});

describe('conceptos y fecha contable', () => {
  it('reparte entre operación e inversión según la factura', () => {
    expect(
      conceptosDelReintegro([
        { montoCentavos: 6000, deActivoFijo: false },
        { montoCentavos: 10000, deActivoFijo: true },
      ]),
    ).toEqual([
      { claveDeSistema: 'reintegro_de_proveedor', montoCentavos: 6000 },
      { claveDeSistema: 'reintegro_de_proveedor_de_activo', montoCentavos: 10000 },
    ]);
    expect(conceptosDelReintegro([{ montoCentavos: 500, deActivoFijo: true }])).toHaveLength(1);
  });

  it('la anulación fecha sin inverso con el reintegro, con inverso con el inverso y en efectivo con hoy', () => {
    const reintegro = { fecha: '2026-03-10' };
    const hoy = '2026-03-20';
    expect(fechaDeAnulacionDelPago(reintegro, { enBancos: 'sin_inverso', fechaDelInverso: null, hoy })).toBe(
      '2026-03-10',
    );
    expect(fechaDeAnulacionDelPago(reintegro, { enBancos: 'con_inverso', fechaDelInverso: '2026-03-15', hoy })).toBe(
      '2026-03-15',
    );
    expect(fechaDeAnulacionDelPago(reintegro, { enBancos: null, fechaDelInverso: null, hoy })).toBe(hoy);
    expect(efectoDelReintegro({ forma: 'deposito' })).toBe('banco');
    expect(efectoDelReintegro({ forma: 'efectivo' })).toBe('efectivo');
  });
});
