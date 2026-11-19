import { describe, expect, it } from 'vitest';
import type { Activo } from '../../../dominio/activo.js';
import { VidaUtilTotalExcedida } from '../../../dominio/errores-de-mejora.js';
import type { TramoGuardado } from '../../../dominio/depreciacion/tramo.js';
import { aplicarEstimacion } from './eventos-de-mejoras.js';

const contable = (desdePeriodo: string, meses: number, residual = 100): TramoGuardado =>
  ({ id: desdePeriodo, libro: 'contable', desdePeriodo, meses, valorResidualCentavos: residual }) as TramoGuardado;

/** Un activo mínimo que recuerda lo que se le ajusta. */
function activoCon(vida: number | null, residual: string | null) {
  const guardado = { fechaDeInicioDeUso: '2020-03-10', vidaUtilContableMeses: vida, valorResidual: residual };
  const ajustes: unknown[] = [];
  const activo = {
    instantanea: () => guardado,
    ajustarEstimacion: (estimacion: unknown) => ajustes.push(estimacion),
  } as unknown as Activo;
  return { activo, ajustes };
}

describe('aplicarEstimacion (vida guardada)', () => {
  it('con primer mes siguiente, el primer tramo ya empieza un mes después y la vida sigue siendo 60', () => {
    const { activo, ajustes } = activoCon(60, '1.00');
    expect(aplicarEstimacion(activo, [contable('2020-04-01', 60)])).toBe(false);
    expect(ajustes).toEqual([]);
  });

  it('en un saldo inicial antiguo cuenta desde su primer tramo: no salta a los años de uso', () => {
    const { activo, ajustes } = activoCon(60, '1.00');
    expect(aplicarEstimacion(activo, [contable('2026-01-01', 60)])).toBe(false);
    expect(ajustes).toEqual([]);
  });

  it('con una estimación nueva suma lo que pasó desde el primer tramo y la deja en el activo', () => {
    const { activo, ajustes } = activoCon(60, '1.00');
    const tramos = [contable('2026-01-01', 10), contable('2026-11-01', 50, 200)];
    expect(aplicarEstimacion(activo, tramos)).toBe(true);
    expect(ajustes).toEqual([{ vidaUtilContableMeses: 60, valorResidual: '2.00' }]);
  });

  it('rechaza una vida guardada de más de 1,200 meses', () => {
    const { activo } = activoCon(60, '1.00');
    const tramos = [contable('2020-01-01', 60), contable('2030-01-01', 1200)];
    expect(() => aplicarEstimacion(activo, tramos)).toThrow(VidaUtilTotalExcedida);
  });
});
