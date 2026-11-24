import { describe, expect, it } from 'vitest';
import type { Bodega } from '../../servicios/bodegas.api';
import type { DepartamentoParaElegir } from '../../servicios/ubicaciones.api';
import {
  bodegaUnica,
  departamentoVigente,
  opcionesDeBodegasActivas,
  opcionesDeDepartamentosActivos,
} from './opciones-de-documento';

const bodega = (id: string, nombre: string, activo = true) => ({ id, nombre, activo }) as Bodega;
const departamento = (id: string, nombre: string, resto: Partial<DepartamentoParaElegir> = {}) =>
  ({ id, nombre, localidadId: null, activo: true, codigo: id, ...resto }) as DepartamentoParaElegir;

describe('opciones de un documento', () => {
  it('las bodegas inactivas no se ofrecen y el resto va por nombre', () => {
    const opciones = opcionesDeBodegasActivas([bodega('2', 'Zona'), bodega('1', 'Anexo'), bodega('3', 'Vieja', false)]);
    expect(opciones.map((o) => o.texto)).toEqual(['Elija la bodega', 'Anexo', 'Zona']);
  });

  it('con una sola bodega activa se propone', () => {
    expect(bodegaUnica([bodega('1', 'Única'), bodega('2', 'Vieja', false)])).toBe('1');
    expect(bodegaUnica([bodega('1', 'A'), bodega('2', 'B')])).toBeNull();
    expect(bodegaUnica([])).toBeNull();
  });

  it('los departamentos se limitan a la localidad elegida', () => {
    const lista = [
      departamento('d1', 'Ordeño', { localidadId: 'l1' }),
      departamento('d2', 'Taller', { localidadId: 'l2' }),
      departamento('d3', 'Administración'),
      departamento('d4', 'Cerrado', { localidadId: 'l1', activo: false }),
    ];
    expect(opcionesDeDepartamentosActivos(lista, 'l1').map((o) => o.texto)).toEqual([
      'Sin departamento',
      'Administración',
      'Ordeño',
    ]);
    expect(opcionesDeDepartamentosActivos(lista, null)).toHaveLength(4);
  });

  it('al cambiar de localidad se quita el departamento que ya no es de sus opciones', () => {
    const lista = [
      departamento('d1', 'Ordeño', { localidadId: 'l1' }),
      departamento('d2', 'Taller', { localidadId: 'l2' }),
      departamento('d3', 'Administración'),
    ];
    const deLaNueva = opcionesDeDepartamentosActivos(lista, 'l2');
    expect(departamentoVigente(deLaNueva, 'd1')).toBeNull();
    expect(departamentoVigente(deLaNueva, 'd2')).toBe('d2');
    expect(departamentoVigente(deLaNueva, 'd3')).toBe('d3');
    expect(departamentoVigente(deLaNueva, null)).toBeNull();
  });
});
