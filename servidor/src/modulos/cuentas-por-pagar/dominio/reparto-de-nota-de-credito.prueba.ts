import { describe, expect, it } from 'vitest';
import { repartirNotaDeCredito } from './reparto-de-nota-de-credito.js';

const factura = (saldoCentavos: number) => ({ id: 'factura', saldoCentavos });
const notaDeDebito = (id: string, saldoCentavos: number) => ({ id, saldoCentavos });

describe('reparto de una nota de crédito', () => {
  it('cabe entera en su factura: no sobra nada', () => {
    const reparto = repartirNotaDeCredito(3000, [factura(11200)]);

    expect(reparto).toEqual({ aplicaciones: [{ cargoId: 'factura', montoCentavos: 3000 }], saldoLibreCentavos: 0 });
  });

  it('una devolución total de una factura con retenciones deja libre lo retenido', () => {
    // Factura de 112.00 con 12.00 de retenciones: se le debe al proveedor 100.00.
    const reparto = repartirNotaDeCredito(11200, [factura(10000)]);

    expect(reparto.aplicaciones).toEqual([{ cargoId: 'factura', montoCentavos: 10000 }]);
    expect(reparto.saldoLibreCentavos).toBe(1200);
  });

  it('lo que sobra de la factura pasa a sus notas de débito, de la más antigua a la más nueva', () => {
    const cargos = [factura(10000), notaDeDebito('nd-1', 500), notaDeDebito('nd-2', 800)];

    const reparto = repartirNotaDeCredito(11000, cargos);

    expect(reparto.aplicaciones).toEqual([
      { cargoId: 'factura', montoCentavos: 10000 },
      { cargoId: 'nd-1', montoCentavos: 500 },
      { cargoId: 'nd-2', montoCentavos: 500 },
    ]);
    expect(reparto.saldoLibreCentavos).toBe(0);
  });

  it('aplica a la nota de débito aunque la factura ya no deba nada', () => {
    const reparto = repartirNotaDeCredito(400, [factura(0), notaDeDebito('nd-1', 1000)]);

    expect(reparto.aplicaciones).toEqual([{ cargoId: 'nd-1', montoCentavos: 400 }]);
    expect(reparto.saldoLibreCentavos).toBe(0);
  });

  it('sin cargos con saldo, toda la nota queda como saldo libre', () => {
    expect(repartirNotaDeCredito(5000, [])).toEqual({ aplicaciones: [], saldoLibreCentavos: 5000 });
    expect(repartirNotaDeCredito(5000, [factura(0)])).toEqual({ aplicaciones: [], saldoLibreCentavos: 5000 });
  });

  it('un saldo negativo no se toma como espacio para aplicar', () => {
    expect(repartirNotaDeCredito(100, [factura(-50)])).toEqual({ aplicaciones: [], saldoLibreCentavos: 100 });
  });

  it('los montos suman exactamente la nota, sin errores de centavos', () => {
    const reparto = repartirNotaDeCredito(1010, [factura(10), notaDeDebito('nd', 1000)]);
    const aplicado = reparto.aplicaciones.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);

    expect(aplicado + reparto.saldoLibreCentavos).toBe(1010);
  });
});
