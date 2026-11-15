import { describe, expect, it } from 'vitest';
import { documentoSembrado } from '../pruebas/dobles-de-aplicaciones.js';
import type { CargoParaPagar } from './registro-de-pago.js';
import {
  exigirCargoPagable,
  exigirDiferenciasValidas,
  exigirFechaDelPago,
  exigirLineasValidas,
  exigirMontoQueCabe,
  fechaMinimaDelPago,
  retencionPorDescontar,
} from './registro-de-pago.js';

const cargo = (cambios: Partial<CargoParaPagar> = {}, documento = {}): CargoParaPagar => ({
  documento: documentoSembrado({ tipo: 'factura', estado: 'autorizado', proveedorId: 'P1', ...documento }),
  saldoCentavos: 10000,
  contrasenaId: 'C1',
  ...cambios,
});

describe('las líneas del pago', () => {
  it('piden de 1 a 100 cargos, montos positivos y sin repetir', () => {
    expect(() => exigirLineasValidas([])).toThrow(expect.objectContaining({ codigo: 'pago_sin_documentos' }));
    const demasiadas = Array.from({ length: 101 }, (_, i) => ({ cargoId: String(i), montoCentavos: 1 }));
    expect(() => exigirLineasValidas(demasiadas)).toThrow(
      expect.objectContaining({ codigo: 'demasiados_documentos_en_pago' }),
    );
    expect(() => exigirLineasValidas([{ cargoId: 'a', montoCentavos: 0 }])).toThrow(
      expect.objectContaining({ codigo: 'monto_de_pago_invalido' }),
    );
    const repetido = [
      { cargoId: 'a', montoCentavos: 1 },
      { cargoId: 'a', montoCentavos: 2 },
    ];
    expect(() => exigirLineasValidas(repetido)).toThrow(expect.objectContaining({ codigo: 'cargo_repetido' }));
    expect(() => exigirLineasValidas([{ cargoId: 'a', montoCentavos: 5 }])).not.toThrow();
  });
});

describe('qué cargo se puede pagar', () => {
  it('solo lo autorizado y en una contraseña vigente', () => {
    expect(() => exigirCargoPagable(cargo(), 'P1', 0)).not.toThrow();
    expect(() => exigirCargoPagable(cargo({}, { estado: 'registrado' }), 'P1', 0)).toThrow(
      expect.objectContaining({ codigo: 'documento_sin_autorizar' }),
    );
    expect(() => exigirCargoPagable(cargo({ contrasenaId: null }), 'P1', 0)).toThrow(
      expect.objectContaining({ codigo: 'documento_fuera_de_la_contrasena' }),
    );
  });

  it('rechaza un cargo de otro proveedor, una nota de crédito o un documento anulado', () => {
    const noDisponible = expect.objectContaining({ codigo: 'cargo_no_disponible' });

    expect(() => exigirCargoPagable(cargo(), 'OTRO', 0)).toThrow(noDisponible);
    expect(() => exigirCargoPagable(cargo({}, { tipo: 'nota_de_credito' }), 'P1', 0)).toThrow(noDisponible);
    expect(() => exigirCargoPagable(cargo({}, { estado: 'anulado' }), 'P1', 0)).toThrow(noDisponible);
  });

  it('el monto no pasa del saldo', () => {
    expect(() => exigirMontoQueCabe(cargo(), 10000, 0)).not.toThrow();
    expect(() => exigirMontoQueCabe(cargo(), 10001, 2)).toThrow(
      expect.objectContaining({ codigo: 'pago_mayor_que_el_saldo', detalles: { campo: 'aplicaciones.2.monto' } }),
    );
  });
});

describe('la retención se descuenta una sola vez', () => {
  it('en el primer pago vigente de un documento del libro', () => {
    const documento = documentoSembrado({ origen: 'libro_de_compras', retencionesCentavos: 1200 });

    expect(retencionPorDescontar(documento, false)).toBe(1200);
    expect(retencionPorDescontar(documento, true)).toBe(0);
  });

  it('nunca en un saldo inicial, que ya viene neto', () => {
    const inicial = documentoSembrado({ origen: 'saldo_inicial', retencionesCentavos: 1200 });

    expect(retencionPorDescontar(inicial, false)).toBe(0);
  });
});

describe('la fecha del pago', () => {
  it('no precede a la emisión de los documentos ni, con un saldo inicial, a la fecha de inicio', () => {
    const emisiones = ['2026-10-05', '2026-10-20'];

    expect(fechaMinimaDelPago({ emisiones, fechaDeInicio: null })).toBe('2026-10-20');
    expect(fechaMinimaDelPago({ emisiones, fechaDeInicio: '2026-11-01' })).toBe('2026-11-01');
    expect(() => exigirFechaDelPago('2026-10-19', '2026-10-20')).toThrow(
      expect.objectContaining({ codigo: 'fecha_de_pago_invalida', detalles: { campo: 'fecha' } }),
    );
    expect(() => exigirFechaDelPago('2027-01-01', '2026-10-20')).not.toThrow();
  });
});

describe('las diferencias de centavos', () => {
  const restantes = new Map([['a', { etiqueta: 'A-1', restanteCentavos: 3 }]]);
  const una =
    (cargoId: string, montoCentavos: number, tope = 100) =>
    () =>
      exigirDiferenciasValidas([{ cargoId, montoCentavos }], restantes, tope);

  it('pasan si son de un cargo del pago, dentro del tope y del residuo', () => {
    expect(una('a', 3)).not.toThrow();
  });

  it('se rechaza la de un cargo fuera del pago, la que pasa del tope y la que pasa del residuo', () => {
    expect(una('otro', 1)).toThrow(expect.objectContaining({ codigo: 'diferencia_fuera_del_pago' }));
    expect(una('a', 3, 2)).toThrow(expect.objectContaining({ codigo: 'diferencia_de_pago_sobre_el_tope' }));
    expect(una('a', 4)).toThrow(expect.objectContaining({ codigo: 'diferencia_mayor_que_el_saldo' }));
    expect(una('a', 0)).toThrow(expect.objectContaining({ codigo: 'monto_de_pago_invalido' }));
  });
});
