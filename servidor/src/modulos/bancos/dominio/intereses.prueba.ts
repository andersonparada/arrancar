import { describe, expect, it } from 'vitest';
import {
  DatosDeInteresesNoAplican,
  DatosDeInteresesObligatorios,
  InteresesNoCuadran,
  exigirInteresesCoherentes,
} from './intereses.js';

const credito = { tipo: 'credito', monto: '90.00' };

describe('datos de intereses de una nota', () => {
  it('con un concepto que los pide, acepta bruto = neto + ISR', () => {
    expect(() =>
      exigirInteresesCoherentes({ ...credito, interesBruto: '100.00', isrRetenido: '10.00' }, true),
    ).not.toThrow();
    expect(() => exigirInteresesCoherentes({ ...credito, interesBruto: '90', isrRetenido: '0' }, true)).not.toThrow();
  });

  it('exige los dos datos', () => {
    expect(() => exigirInteresesCoherentes({ ...credito }, true)).toThrow(DatosDeInteresesObligatorios);
    expect(() => exigirInteresesCoherentes({ ...credito, interesBruto: '100.00', isrRetenido: null }, true)).toThrow(
      DatosDeInteresesObligatorios,
    );
  });

  it('rechaza lo que no cuadra, un ISR negativo y una nota de débito', () => {
    const cuadrado = { interesBruto: '100.00', isrRetenido: '10.00' };
    expect(() => exigirInteresesCoherentes({ ...credito, interesBruto: '100.00', isrRetenido: '9.99' }, true)).toThrow(
      InteresesNoCuadran,
    );
    expect(() => exigirInteresesCoherentes({ ...credito, interesBruto: '89.00', isrRetenido: '-1.00' }, true)).toThrow(
      InteresesNoCuadran,
    );
    expect(() => exigirInteresesCoherentes({ tipo: 'debito', monto: '90.00', ...cuadrado }, true)).toThrow(
      InteresesNoCuadran,
    );
  });

  it('sin concepto que los pida, no admite ninguno', () => {
    expect(() => exigirInteresesCoherentes({ ...credito }, false)).not.toThrow();
    expect(() => exigirInteresesCoherentes({ ...credito, interesBruto: null, isrRetenido: null }, false)).not.toThrow();
    expect(() => exigirInteresesCoherentes({ ...credito, isrRetenido: '0.00' }, false)).toThrow(
      DatosDeInteresesNoAplican,
    );
  });
});
