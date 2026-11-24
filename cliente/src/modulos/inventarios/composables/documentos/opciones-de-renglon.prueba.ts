import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Articulo, ConversionDeArticulo, Lote } from '../../servicios/articulos.api';
import type { Existencia } from '../../servicios/existencias.api';
import {
  idsDeLotesConExistencia,
  lotePropuesto,
  lotesPorVencimiento,
  opcionesDeArticulos,
  opcionesDeLotes,
  opcionesDeUnidades,
} from './opciones-de-renglon';

const lote = (id: string, codigo: string, fechaDeVencimiento: string | null): Lote => ({
  id,
  articuloId: 'a1',
  codigo,
  fechaDeVencimiento,
  fechaDeFabricacion: null,
  observaciones: null,
});

beforeEach(() => setActivePinia(createPinia()));

describe('opciones de un renglón', () => {
  it('los artículos van por nombre, solo los activos', () => {
    const articulos = [
      { id: '2', nombre: 'Vacuna', codigo: 'V', activo: true },
      { id: '1', nombre: 'Alimento', codigo: 'A', activo: true },
      { id: '3', nombre: 'Viejo', codigo: 'O', activo: false },
    ] as Articulo[];
    expect(opcionesDeArticulos(articulos).map((o) => o.texto)).toEqual([
      'Elija el artículo',
      'Alimento (A)',
      'Vacuna (V)',
    ]);
  });

  it('las unidades ofrecen la base primero y las de empaque por nombre', () => {
    const articulo = { unidadBaseNombre: 'Libra' } as Articulo;
    const conversiones = [
      { unidadId: 'u2', unidadNombre: 'Saco', factor: '100', paraCompras: true },
      { unidadId: 'u1', unidadNombre: 'Caja', factor: '24', paraCompras: false },
    ] as ConversionDeArticulo[];
    const opciones = opcionesDeUnidades(articulo, conversiones);
    expect(opciones.map((o) => o.texto)).toEqual(['Libra (base)', 'Caja', 'Saco']);
    expect(opciones[0]?.valor).toBeNull();
  });

  it('los lotes que vencen primero van primero y los que no vencen al final', () => {
    const lotes = [lote('l1', 'B', null), lote('l2', 'A', '2027-03-01'), lote('l3', 'C', '2026-12-01')];
    expect(lotesPorVencimiento(lotes).map((l) => l.id)).toEqual(['l3', 'l2', 'l1']);
  });

  it('marca el lote vencido', () => {
    const textos = opcionesDeLotes([lote('l1', 'A', '2026-01-01')], '2026-11-23').map((o) => o.texto);
    expect(textos[1]).toMatch(/vencido/);
  });

  it('propone el lote que vence primero sin contar los vencidos', () => {
    const lotes = [lote('l1', 'A', '2026-01-01'), lote('l2', 'B', '2027-01-01'), lote('l3', 'C', '2026-12-31')];
    const todos = new Set(['l1', 'l2', 'l3']);
    expect(lotePropuesto(lotes, '2026-11-23', todos)).toBe('l3');
    expect(lotePropuesto([lote('l1', 'A', '2026-01-01')], '2026-11-23', todos)).toBeNull();
  });

  it('no propone un lote agotado en la bodega aunque venza primero', () => {
    const lotes = [lote('agotado', 'A', '2026-12-01'), lote('con', 'B', '2027-06-01'), lote('sin-fecha', 'C', null)];
    expect(lotePropuesto(lotes, '2026-11-23', new Set(['con', 'sin-fecha']))).toBe('con');
    expect(lotePropuesto(lotes, '2026-11-23', new Set())).toBeNull();
  });

  it('los lotes con existencia salen de las existencias de la bodega, sin repetirse ni contar ceros', () => {
    const fila = (loteId: string | null, cantidad: string) => ({ loteId, cantidad }) as Existencia;
    const ids = idsDeLotesConExistencia([
      fila('l1', '5.0000'),
      fila('l1', '2.0000'),
      fila('l2', '0.0000'),
      fila(null, '9'),
    ]);
    expect(ids).toEqual(['l1']);
  });
});
