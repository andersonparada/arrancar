import { describe, expect, it } from 'vitest';
import { armarReporteDeIntereses } from './calculo-de-intereses.js';
import type { InteresDelReporteDto } from './dto/intereses.dto.js';

const nota = (cambios: Partial<InteresDelReporteDto>): InteresDelReporteDto => ({
  movimientoId: crypto.randomUUID(),
  fecha: '2026-03-31',
  cuentaBancariaId: 'a',
  cuentaBancariaNombre: 'Monetaria',
  numero: 1,
  referencia: null,
  interesBruto: '100.00',
  isrRetenido: '10.00',
  neto: '90.00',
  ...cambios,
});

const filtro = { desde: '2026-01-01', hasta: '2026-12-31' };

describe('reporte de intereses', () => {
  it('suma en centavos exactos: 0.10 + 0.20 es 0.30, y el neto es bruto - ISR', () => {
    const notas = [
      nota({ interesBruto: '0.10', isrRetenido: '0.01', neto: '0.09' }),
      nota({ interesBruto: '0.20', isrRetenido: '0.02', neto: '0.18' }),
    ];

    const reporte = armarReporteDeIntereses(notas, { filtro, notasSinDatos: 0 });

    expect(reporte).toMatchObject({ totalDeNotas: 2, interesBruto: '0.30', isrRetenido: '0.03', neto: '0.27' });
  });

  it('agrupa por cuenta, ordenadas por nombre, y arrastra las notas sin datos', () => {
    const notas = [
      nota({ cuentaBancariaId: 'b', cuentaBancariaNombre: 'Ahorro' }),
      nota({ cuentaBancariaId: 'a' }),
      nota({
        cuentaBancariaId: 'b',
        cuentaBancariaNombre: 'Ahorro',
        interesBruto: '50.00',
        isrRetenido: '5.00',
        neto: '45.00',
      }),
    ];

    const reporte = armarReporteDeIntereses(notas, { filtro, notasSinDatos: 2 });

    expect(reporte.notasSinDatos).toBe(2);
    expect(reporte.porCuenta.map((c) => [c.cuentaBancariaNombre, c.cantidad, c.interesBruto, c.isrRetenido])).toEqual([
      ['Ahorro', 2, '150.00', '15.00'],
      ['Monetaria', 1, '100.00', '10.00'],
    ]);
  });

  it('sin notas todo es cero', () => {
    const reporte = armarReporteDeIntereses([], { filtro, notasSinDatos: 0 });

    expect(reporte).toMatchObject({ totalDeNotas: 0, interesBruto: '0.00', isrRetenido: '0.00', neto: '0.00' });
    expect(reporte.cuentaBancariaId).toBeNull();
  });
});
