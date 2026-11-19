import { describe, expect, it } from 'vitest';
import type { FilaDelReporte } from '../../servicios/movimientos.api';
import { totalesDelEstado } from './totales-del-estado-de-cuenta';

const fila = (datos: Partial<FilaDelReporte>): FilaDelReporte =>
  ({ tipo: 'credito', monto: '0.00', saldoInicial: false, anuladoEn: null, ...datos }) as FilaDelReporte;

describe('totalesDelEstado', () => {
  it('suma débitos y créditos por tipo en centavos exactos', () => {
    const totales = totalesDelEstado([
      fila({ tipo: 'credito', monto: '0.10' }),
      fila({ tipo: 'credito', monto: '0.20' }),
      fila({ tipo: 'cheque', monto: '50.00' }),
      fila({ tipo: 'debito', monto: '5.25' }),
      fila({ tipo: 'credito', monto: '100.00', saldoInicial: true }),
    ]);
    expect(totales.creditos).toBe('100.30');
    expect(totales.debitos).toBe('55.25');
    expect(totales.porTipo.map((t) => [t.etiqueta, t.cantidad])).toEqual([
      ['Notas de crédito', 2],
      ['Cheques', 1],
      ['Notas de débito', 1],
      ['Saldo inicial', 1],
    ]);
  });

  it('no cuenta un cheque anulado a la antigua', () => {
    const totales = totalesDelEstado([fila({ tipo: 'cheque', monto: '80.00', anuladoEn: '2026-01-02' })]);
    expect(totales).toEqual({ debitos: '0.00', creditos: '0.00', porTipo: [] });
  });

  it('sin filas, todo en cero', () => {
    expect(totalesDelEstado([]).debitos).toBe('0.00');
  });
});
