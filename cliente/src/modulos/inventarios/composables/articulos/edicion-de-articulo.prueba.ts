import { describe, expect, it } from 'vitest';
import type { DatosArticulo, Articulo } from '../../servicios/articulos.api';
import { datosDeArticulo, edicionDe } from './edicion-de-articulo';

const datos: DatosArticulo = {
  codigo: 'ART-0001',
  nombre: 'Concentrado',
  descripcion: 'Alimento balanceado.',
  categoriaId: '00000000-0000-4000-8000-000000000001',
  tipoDeInventario: 'mercaderia',
  unidadBaseId: '00000000-0000-4000-8000-000000000002',
  manejaLotes: true,
  manejaVencimiento: true,
  codigoDeBarras: '7401234',
  conceptoDeGastoId: '00000000-0000-4000-8000-000000000003',
  existenciaMinima: '12.5000',
  pesoKgPorUnidadBase: '0.4536',
  activo: true,
};
const articulo: Articulo = {
  id: 'articulo-1',
  ...datos,
  categoriaNombre: 'Alimentos',
  unidadBaseNombre: 'Libra',
  conceptoDeGastoNombre: 'Alimento para animales',
};

describe('formulario de artículos', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeArticulo(edicionDe(articulo))).toEqual(datos);
    expect(edicionDe(articulo).id).toBe(articulo.id);
  });

  it('un artículo nuevo empieza sin id, sin categoría ni unidad', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null, categoriaId: null, unidadBaseId: null });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeArticulo(edicionDe())).toMatchObject({
      descripcion: null,
      codigoDeBarras: null,
      conceptoDeGastoId: null,
      existenciaMinima: null,
      pesoKgPorUnidadBase: null,
    });
  });
});
