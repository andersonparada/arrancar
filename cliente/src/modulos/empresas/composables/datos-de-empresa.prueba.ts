import { describe, expect, it } from 'vitest';
import type { CargaInicial } from '../servicios/datos-de-empresa.api';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import {
  avisoDeFechaDeInicio,
  errorConCampoDeFecha,
  RECORDATORIO_DE_CUADRE,
  camposGuardados,
  fechaPorGuardar,
  fiscalesPorGuardar,
  puedeCerrarLaCarga,
} from './datos-de-empresa';

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

describe('aviso de la fecha de inicio', () => {
  it('no avisa si es día 1, si está vacía o incompleta', () => {
    expect(avisoDeFechaDeInicio('2026-11-01')).toBeNull();
    expect(avisoDeFechaDeInicio('2026-01-01')).toBeNull();
    expect(avisoDeFechaDeInicio('')).toBeNull();
    expect(avisoDeFechaDeInicio('2026-11')).toBeNull();
  });

  it('avisa si no es día 1 de un mes', () => {
    expect(avisoDeFechaDeInicio('2026-11-15')).toContain('Se recomienda el día 1 de un mes');
  });
});

describe('error de saldos iniciales posteriores a la fecha', () => {
  const crear = (codigo: string) => new ErrorApi(422, { codigo, mensaje: 'Hay 3 saldos iniciales.' });

  it('señala el campo de la fecha y conserva el mensaje', () => {
    const error = errorConCampoDeFecha(crear('saldos_iniciales_posteriores_a_la_fecha')) as ErrorApi;

    expect(error.campoDelConflicto).toBe('fechaDeInicio');
    expect(error.message).toBe('Hay 3 saldos iniciales.');
  });

  it('deja pasar otros errores', () => {
    const otro = crear('otro');

    expect(errorConCampoDeFecha(otro)).toBe(otro);
  });
});

describe('recordatorio del cuadre', () => {
  it('pide comparar con el balance de apertura', () => {
    expect(RECORDATORIO_DE_CUADRE).toContain('balance de apertura');
  });
});
