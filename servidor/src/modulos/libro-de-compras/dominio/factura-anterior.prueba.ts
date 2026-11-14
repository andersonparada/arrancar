import { describe, expect, it } from 'vitest';
import { FacturaAnteriorInvalida } from './errores-de-factura-anterior.js';
import { normalizarFacturaAnterior, tienenLosMismosDatos, type DatosDeFacturaAnterior } from './factura-anterior.js';
import { revisarLasFechasDeLaFacturaAnterior } from './fechas-de-factura-anterior.js';

const datos = (cambios: Partial<DatosDeFacturaAnterior> = {}): DatosDeFacturaAnterior => ({
  tipo: 'factura',
  serie: ' b ',
  numero: 'f 9',
  autorizacionFel: null,
  fechaEmision: '2026-06-15',
  total: 112000,
  iva: 12000,
  notasDeDebitoAnterioresTotal: 0,
  notasDeDebitoAnterioresIva: 0,
  motivoSinCredito: null,
  detalleDelMotivo: 'sobra',
  ...cambios,
});

describe('normalizarFacturaAnterior', () => {
  it('deja la serie y el número en mayúsculas y sin espacios, y quita el detalle que no hace falta', () => {
    expect(normalizarFacturaAnterior(datos())).toMatchObject({ serie: 'B', numero: 'F9', detalleDelMotivo: null });
  });

  it('el motivo de la familia sin IVA lo pone el servidor', () => {
    const resultado = normalizarFacturaAnterior(datos({ tipo: 'factura_pequeno_contribuyente', iva: 0 }));
    expect(resultado.motivoSinCredito).toBe('pequeno_contribuyente');
  });

  it.each([
    ['total en cero', { total: 0 }],
    ['IVA mayor que el total', { iva: 112001 }],
    [
      'IVA de notas de débito mayor que su total',
      { notasDeDebitoAnterioresTotal: 100, notasDeDebitoAnterioresIva: 200 },
    ],
    ['exenta con IVA', { motivoSinCredito: 'exento' as const }],
    ['motivo de familia escrito a mano', { motivoSinCredito: 'pequeno_contribuyente' as const }],
    ['otra causa sin detalle', { motivoSinCredito: 'otra_causa_sin_credito' as const, detalleDelMotivo: ' ' }],
    ['factura especial', { tipo: 'factura_especial' as const }],
    [
      'primario y pecuario antes de existir',
      { tipo: 'factura_primario_pecuario' as const, fechaEmision: '2025-01-01', iva: 0 },
    ],
  ])('rechaza %s', (_caso, cambios) => {
    expect(() => normalizarFacturaAnterior(datos(cambios))).toThrow(FacturaAnteriorInvalida);
  });
});

describe('tienenLosMismosDatos', () => {
  it('compara todo lo que se guarda', () => {
    expect(tienenLosMismosDatos(datos(), datos())).toBe(true);
    expect(tienenLosMismosDatos(datos(), datos({ total: 1 }))).toBe(false);
    expect(tienenLosMismosDatos(datos({ serie: null }), datos({ serie: null }))).toBe(true);
  });
});

describe('revisarLasFechasDeLaFacturaAnterior', () => {
  const fechas = (cambios: Record<string, string | null> = {}) => ({
    fechaDeInicio: '2026-09-01',
    fechaDeRecepcionDeLaNota: '2026-10-04',
    fechaDeLaFactura: '2026-06-15',
    ...cambios,
  });

  it('acepta una factura anterior reciente sin avisar', () => {
    expect(revisarLasFechasDeLaFacturaAnterior(fechas())).toEqual([]);
  });

  it('avisa desde 4 años (el día exacto no) y rechaza más de 10 años', () => {
    expect(revisarLasFechasDeLaFacturaAnterior(fechas({ fechaDeLaFactura: '2022-09-01' }))).toEqual([]);
    expect(revisarLasFechasDeLaFacturaAnterior(fechas({ fechaDeLaFactura: '2022-08-31' }))).toHaveLength(1);
    expect(() => revisarLasFechasDeLaFacturaAnterior(fechas({ fechaDeLaFactura: '2016-08-31' }))).toThrow(
      'debe ser el 01/09/2016 o posterior',
    );
    expect(revisarLasFechasDeLaFacturaAnterior(fechas({ fechaDeLaFactura: '2016-09-01' }))).toHaveLength(1);
  });
});
