import { describe, expect, it } from 'vitest';
import type { Categoria } from '../../servicios/categorias.api';
import type { Unidad } from '../../servicios/unidades.api';
import { opcionesDeReferencias } from './opciones-de-referencias';

const categoria = (id: string, activo: boolean): Categoria => ({
  id,
  nombre: `Categoría ${id}`,
  tipoDeInventarioPorOmision: 'mercaderia',
  activo,
});
const unidad = (id: string, activo: boolean): Unidad => ({
  id,
  nombre: `Unidad ${id}`,
  simbolo: id,
  magnitud: 'cantidad',
  factorALaReferencia: null,
  activo,
});

describe('opciones del formulario del artículo', () => {
  const opciones = opcionesDeReferencias({
    categorias: [categoria('a', true), categoria('b', false)],
    unidades: [unidad('u', true), unidad('v', false)],
    conceptos: [{ id: 'c', nombre: 'Alimento' }],
  });

  it('ofrece solo las categorías y unidades activas, con la opción vacía obligatoria al inicio', () => {
    expect(opciones.categoriaId).toEqual([
      { valor: null, texto: 'Elija una opción' },
      { valor: 'a', texto: 'Categoría a' },
    ]);
    expect(opciones.unidadBaseId.map((opcion) => opcion.valor)).toEqual([null, 'u']);
  });

  it('el concepto de gasto es opcional: se puede dejar sin elegir', () => {
    expect(opciones.conceptoDeGastoId).toEqual([
      { valor: null, texto: 'Sin elegir' },
      { valor: 'c', texto: 'Alimento' },
    ]);
  });
});
