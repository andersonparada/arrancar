import { describe, expect, it } from 'vitest';
import type { CargaInicial } from '../servicios/datos-de-empresa.api';
import { camposGuardados, fechaPorGuardar, fiscalesPorGuardar, puedeCerrarLaCarga } from './datos-de-empresa';

const guardado = { razonSocial: 'Ganadera, S. A.', nombreComercial: '', fechaDeInicio: '2026-01-01' };
const carga = (cambios: Partial<CargaInicial> = {}): CargaInicial => ({
  empresaId: 'e1',
  fechaDeInicio: '2026-01-01',
  cerrada: false,
  cerradaEn: null,
  cerradaPor: null,
  ...cambios,
});

describe('campos guardados', () => {
  it('lo que falta se muestra vacío', () => {
    const fiscales = { empresaId: 'e1', razonSocial: null, nombreComercial: 'El Quiroa' };

    expect(camposGuardados(fiscales, carga({ fechaDeInicio: null }))).toEqual({
      razonSocial: '',
      nombreComercial: 'El Quiroa',
      fechaDeInicio: '',
    });
  });
});

describe('datos fiscales por guardar', () => {
  it('sin cambios no se guarda nada', () => {
    expect(fiscalesPorGuardar(guardado, guardado)).toBeNull();
  });

  it('lo vacío se guarda como nada y se recortan los espacios', () => {
    const cambiado = { ...guardado, razonSocial: '  Nueva, S. A. ', nombreComercial: '   ' };

    expect(fiscalesPorGuardar(cambiado, guardado)).toEqual({ razonSocial: 'Nueva, S. A.', nombreComercial: null });
  });
});

describe('fecha de inicio por guardar', () => {
  it('se guarda solo si cambió', () => {
    expect(fechaPorGuardar(guardado, guardado, false)).toBeNull();
    expect(fechaPorGuardar({ ...guardado, fechaDeInicio: '2026-02-01' }, guardado, false)).toBe('2026-02-01');
  });

  it('no se manda con la carga cerrada ni vacía', () => {
    expect(fechaPorGuardar({ ...guardado, fechaDeInicio: '2026-02-01' }, guardado, true)).toBeNull();
    expect(fechaPorGuardar({ ...guardado, fechaDeInicio: '' }, guardado, false)).toBeNull();
  });
});

describe('cerrar la carga inicial', () => {
  it('se puede con la fecha guardada y sin cambios pendientes', () => {
    expect(puedeCerrarLaCarga(guardado, carga())).toBe(true);
  });

  it('no se puede sin fecha, con la fecha cambiada sin guardar o ya cerrada', () => {
    expect(puedeCerrarLaCarga({ ...guardado, fechaDeInicio: '' }, carga({ fechaDeInicio: null }))).toBe(false);
    expect(puedeCerrarLaCarga({ ...guardado, fechaDeInicio: '2026-02-01' }, carga())).toBe(false);
    expect(puedeCerrarLaCarga(guardado, carga({ cerrada: true }))).toBe(false);
    expect(puedeCerrarLaCarga(guardado, null)).toBe(false);
  });
});
