import { describe, expect, it } from 'vitest';
import { filtroDeLaConsulta, filtrosPorOmision } from './filtros-del-flujo';
import { debeLlevarALaBandeja, esNegativo, resumenDelCuadre, TITULOS_DE_ACTIVIDAD } from './textos-del-flujo';

describe('filtros del flujo de efectivo', () => {
  it('al abrir son todas las cuentas y el mes en curso', () => {
    expect(filtrosPorOmision(new Date(2026, 8, 29))).toEqual({
      cuentaBancariaId: null,
      desde: '2026-09-01',
      hasta: '2026-09-29',
    });
  });

  it('al servidor va el rango siempre y la cuenta solo si se eligió', () => {
    const filtros = { cuentaBancariaId: null, desde: '2026-02-01', hasta: '2026-02-28' };

    expect(filtroDeLaConsulta(filtros)).toEqual({
      desde: '2026-02-01',
      hasta: '2026-02-28',
      cuentaBancariaId: undefined,
    });
    expect(filtroDeLaConsulta({ ...filtros, cuentaBancariaId: 'cb-1' }).cuentaBancariaId).toBe('cb-1');
  });
});

describe('textos del flujo', () => {
  it('nombra las tres actividades', () => {
    expect(Object.values(TITULOS_DE_ACTIVIDAD)).toEqual([
      'Actividades de operación',
      'Actividades de inversión',
      'Actividades de financiamiento',
    ]);
  });

  it('reconoce los montos que restan', () => {
    expect(esNegativo('-80.00')).toBe(true);
    expect(esNegativo('80.00')).toBe(false);
    expect(esNegativo('0.00')).toBe(false);
  });

  it('dice claramente si cuadra o no', () => {
    expect(resumenDelCuadre({ cuadra: true })).toContain('cuadra con');
    expect(resumenDelCuadre({ cuadra: false })).toContain('NO cuadra');
  });

  it('solo lo sin clasificar con pendientes lleva a la bandeja', () => {
    expect(debeLlevarALaBandeja({ clave: 'sin_clasificar', cantidad: 2 })).toBe(true);
    expect(debeLlevarALaBandeja({ clave: 'sin_clasificar', cantidad: 0 })).toBe(false);
    expect(debeLlevarALaBandeja({ clave: 'transferencias', cantidad: 3 })).toBe(false);
  });
});
