import { describe, expect, it } from 'vitest';
import { DocumentoInvalido } from './errores-de-kardex.js';
import { diaAnterior } from './fechas.js';
import type { RenglonDePlan } from './plan-de-documento.js';
import { planDeSaldoInicial } from './saldo-inicial.js';

const renglon = (cambios: Partial<RenglonDePlan> = {}): RenglonDePlan => ({
  articuloId: 'a-1',
  loteId: null,
  cantidad: 1_000_000n,
  cantidadEscrita: 1_000_000n,
  unidadEscritaId: 'lb',
  costoTotal: 20_000n,
  ...cambios,
});

const datos = (renglones: RenglonDePlan[]) => ({
  fecha: '2026-08-31',
  bodegaId: 'b-1',
  observaciones: null,
  renglones,
});

describe('planDeSaldoInicial', () => {
  it('arma un documento de entradas sin causa ni soporte y con la capa en el día del documento', () => {
    const plan = planDeSaldoInicial(datos([renglon()]));

    expect(plan).toMatchObject({ clase: 'saldo_inicial', fecha: '2026-08-31', causa: null, soporte: null });
    expect(plan.renglones[0]!.fechaDeCapa).toBe('2026-08-31');
  });

  it('respeta la fecha de la capa de cada renglón (la compra real)', () => {
    const plan = planDeSaldoInicial(datos([renglon({ fechaDeCapa: '2026-03-15' })]));

    expect(plan.renglones[0]!.fechaDeCapa).toBe('2026-03-15');
  });

  it('admite el costo cero, que la revisión del cierre avisa', () => {
    expect(() => planDeSaldoInicial(datos([renglon({ costoTotal: 0n })]))).not.toThrow();
  });

  it('exige al menos un renglón con cantidad mayor que cero', () => {
    expect(() => planDeSaldoInicial(datos([]))).toThrow(DocumentoInvalido);
    expect(() => planDeSaldoInicial(datos([renglon({ cantidad: 0n })]))).toThrow(DocumentoInvalido);
  });

  it('rechaza un costo negativo y una capa posterior al día del saldo', () => {
    expect(() => planDeSaldoInicial(datos([renglon({ costoTotal: -1n })]))).toThrow(DocumentoInvalido);
    expect(() => planDeSaldoInicial(datos([renglon({ fechaDeCapa: '2026-09-01' })]))).toThrow(DocumentoInvalido);
  });
});

describe('diaAnterior', () => {
  it('cruza los límites de mes y de año', () => {
    expect(diaAnterior('2026-09-01')).toBe('2026-08-31');
    expect(diaAnterior('2027-01-01')).toBe('2026-12-31');
    expect(diaAnterior('2028-03-01')).toBe('2028-02-29');
  });
});
