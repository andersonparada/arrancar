import { describe, expect, it } from 'vitest';
import type { Articulo } from '../../servicios/articulos.api';
import type { Categoria } from '../../servicios/categorias.api';
import { edicionDe } from './edicion-de-articulo';
import { aplicarManejaLotes, aplicarManejaVencimiento, filtrarArticulos, tipoPropuestoPor } from './reglas-de-articulo';

const articulo = (codigo: string, nombre: string, codigoDeBarras: string | null = null): Articulo => ({
  id: codigo,
  codigo,
  nombre,
  descripcion: null,
  categoriaId: 'c',
  tipoDeInventario: 'mercaderia',
  unidadBaseId: 'u',
  manejaLotes: false,
  manejaVencimiento: false,
  codigoDeBarras,
  conceptoDeGastoId: null,
  existenciaMinima: null,
  pesoKgPorUnidadBase: null,
  activo: true,
  categoriaNombre: null,
  unidadBaseNombre: null,
  conceptoDeGastoNombre: null,
});

describe('lotes y vencimiento', () => {
  it('encender el vencimiento enciende los lotes', () => {
    const edicion = { ...edicionDe(), manejaVencimiento: true };
    aplicarManejaVencimiento(edicion);
    expect(edicion.manejaLotes).toBe(true);
  });

  it('apagar los lotes apaga el vencimiento', () => {
    const edicion = { ...edicionDe(), manejaLotes: false, manejaVencimiento: true };
    aplicarManejaLotes(edicion);
    expect(edicion.manejaVencimiento).toBe(false);
  });

  it('con lotes encendidos el vencimiento se conserva', () => {
    const edicion = { ...edicionDe(), manejaLotes: true, manejaVencimiento: true };
    aplicarManejaLotes(edicion);
    expect(edicion.manejaVencimiento).toBe(true);
  });
});

describe('tipo propuesto por la categoría', () => {
  const categorias = [
    { id: 'a', nombre: 'Insumos', tipoDeInventarioPorOmision: 'suministros', activo: true },
  ] as Categoria[];

  it('toma el de la categoría elegida', () => {
    expect(tipoPropuestoPor(categorias, 'a', 'mercaderia')).toBe('suministros');
  });

  it('sin categoría conocida deja el que estaba', () => {
    expect(tipoPropuestoPor(categorias, null, 'repuestos')).toBe('repuestos');
    expect(tipoPropuestoPor(categorias, 'otra', 'repuestos')).toBe('repuestos');
  });
});

describe('búsqueda en la lista', () => {
  const lista = [articulo('ART-1', 'Concentrado de engorde', '7401'), articulo('ART-2', 'Sal mineral')];

  it('busca por código, nombre o código de barras, sin tildes ni mayúsculas', () => {
    expect(filtrarArticulos(lista, 'art-2').map((a) => a.id)).toEqual(['ART-2']);
    expect(filtrarArticulos(lista, 'CONCENTRADO').map((a) => a.id)).toEqual(['ART-1']);
    expect(filtrarArticulos(lista, '7401').map((a) => a.id)).toEqual(['ART-1']);
    expect(filtrarArticulos(lista, 'mineral ').map((a) => a.id)).toEqual(['ART-2']);
  });

  it('sin texto devuelve todos', () => {
    expect(filtrarArticulos(lista, '  ')).toHaveLength(2);
  });
});
