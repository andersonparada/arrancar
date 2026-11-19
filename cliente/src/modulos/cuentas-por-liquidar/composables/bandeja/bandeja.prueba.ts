import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { gastoDeBandejaDeEjemplo } from '../ejemplos.soporte';
import {
  asignacionVacia,
  cantidadDeFiltrosDeBandeja,
  consultaDeBandeja,
  detallesDeLaFilaDeBandeja,
  documentosPorAsignar,
  erroresDeLaAsignacion,
  filtrosInicialesDeBandeja,
  gastosMarcados,
  hayConRetencion,
  motivoDeNoAsignable,
  resumenDeLaAsignacion,
  sePuedeAsignar,
  totalDeLoMarcado,
} from './bandeja';

beforeEach(() => setActivePinia(createPinia()));

const sinRetencion = gastoDeBandejaDeEjemplo({ id: 'g-1', monto: '800.00' });
const conRetencion = gastoDeBandejaDeEjemplo({
  id: 'g-2',
  monto: '450.00',
  montoRetenido: '50.00',
  conRetencion: true,
  puedeAsignarConRetencion: true,
});
const conRetencionSinPermiso = { ...conRetencion, id: 'g-3', puedeAsignarConRetencion: false };

describe('filtros', () => {
  it('abren vacíos y mandan al servidor solo lo escrito', () => {
    expect(cantidadDeFiltrosDeBandeja(filtrosInicialesDeBandeja())).toBe(0);
    const filtros = { desde: '2026-11-01', hasta: '', soloConRetencion: true };
    expect(cantidadDeFiltrosDeBandeja(filtros)).toBe(2);
    expect(consultaDeBandeja(filtros)).toEqual({ desde: '2026-11-01', hasta: undefined, conRetencion: true });
  });
});

describe('qué se puede marcar', () => {
  it('un documento con retención solo lo asigna quien tiene el permiso de excepción', () => {
    expect(sePuedeAsignar(sinRetencion)).toBe(true);
    expect(sePuedeAsignar(conRetencion)).toBe(true);
    expect(sePuedeAsignar(conRetencionSinPermiso)).toBe(false);
  });

  it('lo que no se puede marcar dice por qué y con quién se arregla', () => {
    expect(motivoDeNoAsignable(sinRetencion)).toBeNull();
    expect(motivoDeNoAsignable(conRetencionSinPermiso)).toContain('permiso de excepción');
  });
});

describe('lo marcado', () => {
  it('se toma en el orden de la bandeja y se suma; una nota de crédito resta', () => {
    const nota = gastoDeBandejaDeEjemplo({ id: 'g-4', monto: '100.00', resta: true });
    const marcados = gastosMarcados([sinRetencion, conRetencion, nota], new Set(['g-4', 'g-1']));
    expect(marcados.map(({ id }) => id)).toEqual(['g-1', 'g-4']);
    expect(totalDeLoMarcado(marcados)).toBe('700.00');
  });

  it('sabe si alguno lleva retención', () => {
    expect(hayConRetencion([sinRetencion])).toBe(false);
    expect(hayConRetencion([sinRetencion, conRetencion])).toBe(true);
  });

  it('cada fila dice el proveedor, la fecha, lo que sale del anticipo y la retención', () => {
    const etiquetas = detallesDeLaFilaDeBandeja(conRetencion).map(({ etiqueta }) => etiqueta);
    expect(etiquetas).toEqual(['Proveedor', 'Fecha', 'Sale del anticipo', 'Retención (la entera la empresa)']);
  });
});

describe('asignar', () => {
  it('pide el anticipo y al menos un documento', () => {
    const errores = erroresDeLaAsignacion(asignacionVacia(), []);
    expect(Object.keys(errores).sort()).toEqual(['anticipoId', 'documentos']);
  });

  it('con retención pide el motivo; sin ella, no', () => {
    const edicion = asignacionVacia('a-1');
    expect(erroresDeLaAsignacion(edicion, [sinRetencion])).toEqual({});
    expect(erroresDeLaAsignacion(edicion, [sinRetencion, conRetencion]).motivoConRetencion).toContain('auditoría');
    expect(erroresDeLaAsignacion({ ...edicion, motivoConRetencion: 'Urgente' }, [conRetencion])).toEqual({});
  });

  it('no deja pasar de 100 documentos por tanda', () => {
    const muchos = Array.from({ length: 101 }, (_, i) => gastoDeBandejaDeEjemplo({ id: `g-${i}` }));
    expect(erroresDeLaAsignacion(asignacionVacia('a-1'), muchos).documentos).toContain('100');
  });

  it('el motivo solo viaja en los documentos con retención, y la fecha si se escribió', () => {
    const edicion = { anticipoId: 'a-1', motivoConRetencion: ' Urgente ', fecha: '2026-11-10' };
    expect(documentosPorAsignar([sinRetencion, conRetencion], edicion)).toEqual([
      { gastoId: 'g-1', fecha: '2026-11-10' },
      { gastoId: 'g-2', fecha: '2026-11-10', motivoConRetencion: 'Urgente' },
    ]);
    expect(documentosPorAsignar([sinRetencion], asignacionVacia('a-1'))).toEqual([{ gastoId: 'g-1' }]);
  });

  it('la confirmación cuenta cuántos, por cuánto, a cuál y la excepción de retención', () => {
    const texto = resumenDeLaAsignacion([sinRetencion, conRetencion], 'el anticipo 5 de Ana López');
    expect(texto).toContain('2 documentos');
    expect(texto).toContain('1,250.00');
    expect(texto).toContain('el anticipo 5 de Ana López');
    expect(texto).toContain('Uno lleva retención');
    expect(resumenDeLaAsignacion([sinRetencion], 'el anticipo 5')).not.toContain('retención');
  });
});
