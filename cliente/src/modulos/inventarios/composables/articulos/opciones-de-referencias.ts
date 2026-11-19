import { opcionesDeRegistros } from '@/modulos/core/utilidades/edicion';
import type { ConceptoParaArticulo } from '../../servicios/articulos.api';
import type { Categoria } from '../../servicios/categorias.api';
import type { Unidad } from '../../servicios/unidades.api';

interface RegistrosParaElegir {
  categorias: Categoria[];
  unidades: Unidad[];
  conceptos: ConceptoParaArticulo[];
}

/** Las opciones de los selectores del formulario: categorías y unidades solo activas; el concepto es opcional. */
export function opcionesDeReferencias({ categorias, unidades, conceptos }: RegistrosParaElegir) {
  const activas = <Registro extends { activo: boolean }>(registros: Registro[]) =>
    registros.filter((registro) => registro.activo);
  return {
    categoriaId: opcionesDeRegistros(activas(categorias), (categoria) => categoria.nombre, true),
    unidadBaseId: opcionesDeRegistros(activas(unidades), (unidad) => unidad.nombre, true),
    conceptoDeGastoId: opcionesDeRegistros(conceptos, (concepto) => concepto.nombre, false),
  };
}
