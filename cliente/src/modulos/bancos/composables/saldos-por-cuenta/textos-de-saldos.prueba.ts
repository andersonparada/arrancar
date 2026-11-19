import { describe, expect, it } from 'vitest';
import { detalleDeCuenta, estadoDeConciliacion } from './textos-de-saldos';
import { errorDeLaFecha, filtroDeLaConsulta, filtrosPorOmision } from './filtros-de-saldos';

describe('textos de saldos por cuenta', () => {
  it('dice hasta qué mes está conciliada y si está atrasada', () => {
    expect(estadoDeConciliacion({ ultimaConciliacion: { anio: 2026, mes: 9 }, atrasada: true })).toEqual({
      texto: 'Conciliada hasta 09/2026',
      atrasada: true,
    });
    expect(estadoDeConciliacion({ ultimaConciliacion: null, atrasada: false }).texto).toBe('Sin conciliar');
  });

  it('identifica la cuenta con banco y número', () => {
    expect(detalleDeCuenta({ bancoNombre: 'Banrural', numero: '123' })).toBe('Banrural · 123');
    expect(detalleDeCuenta({ bancoNombre: null, numero: '123' })).toBe('123');
  });
});

describe('filtros de saldos por cuenta', () => {
  it('arranca con todas las cuentas a hoy', () => {
    expect(filtrosPorOmision(new Date(2026, 10, 5))).toEqual({ cuentaBancariaId: null, fecha: '2026-11-05' });
  });

  it('pide la fecha y manda solo lo elegido', () => {
    expect(errorDeLaFecha({ cuentaBancariaId: null, fecha: '' })).toMatch(/fecha de corte/);
    expect(filtroDeLaConsulta({ cuentaBancariaId: null, fecha: '2026-11-05' })).toEqual({
      fecha: '2026-11-05',
      cuentaBancariaId: undefined,
    });
  });
});
