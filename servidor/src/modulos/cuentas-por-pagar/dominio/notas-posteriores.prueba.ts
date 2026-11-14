import { describe, expect, it } from 'vitest';
import {
  notasPosterioresDe,
  SIN_NOTAS_POSTERIORES,
  tieneNotasPosteriores,
  type NotaLibreDelSistemaAnterior,
} from './notas-posteriores.js';

const PROVEEDOR = crypto.randomUUID();
const saldo = { proveedorId: PROVEEDOR, tipo: 'factura' as const, serie: 'A' as string | null, numero: '10' };
const libre = (cambios: Partial<NotaLibreDelSistemaAnterior> = {}): NotaLibreDelSistemaAnterior => ({
  proveedorId: PROVEEDOR,
  tipo: 'nota_de_credito',
  serie: 'A',
  numero: '10',
  saldoLibreCentavos: 2500,
  ...cambios,
});

describe('notasPosterioresDe', () => {
  it('sin notas libres no hay nada', () => {
    expect(notasPosterioresDe(saldo, [])).toEqual(SIN_NOTAS_POSTERIORES);
    expect(tieneNotasPosteriores(SIN_NOTAS_POSTERIORES)).toBe(false);
  });

  it('suma el saldo a favor de las de crédito y cuenta las de débito', () => {
    const notas = notasPosterioresDe(saldo, [
      libre(),
      libre({ saldoLibreCentavos: 100 }),
      libre({ tipo: 'nota_de_debito', saldoLibreCentavos: 0 }),
    ]);

    expect(notas).toEqual({ notasDeCredito: 2, saldoLibreCentavos: 2600, notasDeDebito: 1 });
    expect(tieneNotasPosteriores(notas)).toBe(true);
  });

  it('la serie vacía y la ausente son la misma', () => {
    expect(notasPosterioresDe({ ...saldo, serie: null }, [libre({ serie: null })]).notasDeCredito).toBe(1);
    expect(notasPosterioresDe({ ...saldo, serie: null }, [libre()]).notasDeCredito).toBe(0);
  });

  it('una nota de crédito sin saldo libre no cuenta', () => {
    expect(notasPosterioresDe(saldo, [libre({ saldoLibreCentavos: 0 })])).toEqual(SIN_NOTAS_POSTERIORES);
  });

  it('solo un saldo inicial de familia factura tiene notas posteriores', () => {
    expect(notasPosterioresDe({ ...saldo, tipo: 'recibo' }, [libre()])).toEqual(SIN_NOTAS_POSTERIORES);
    expect(notasPosterioresDe({ ...saldo, tipo: 'factura_especial' }, [libre()]).notasDeCredito).toBe(1);
  });
});
