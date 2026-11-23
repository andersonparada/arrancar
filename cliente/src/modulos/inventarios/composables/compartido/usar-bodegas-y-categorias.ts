import { computed } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiBodegas, type Bodega } from '../../servicios/bodegas.api';
import { apiCategorias, type Categoria } from '../../servicios/categorias.api';
import { opcionesDeFiltro } from './opciones-de-filtro';

/**
 * Las bodegas (las que el usuario ve) y las categorías para los filtros. Solo se piden si el usuario puede verlas:
 * sin el permiso el filtro no se ofrece y la pantalla sigue funcionando.
 */
export function usarBodegasYCategoriasDeFiltro() {
  const sesion = usarSesion();
  const verBodegas = sesion.puede('inventarios.bodegas.ver');
  const verCategorias = sesion.puede('inventarios.categorias.ver');
  const { datos: bodegas } = usarCarga(
    async () => (verBodegas ? apiBodegas.listar() : []),
    [] as Bodega[],
    'No se pudieron cargar las bodegas.',
  );
  const { datos: categorias } = usarCarga(
    async () => (verCategorias ? apiCategorias.listar() : []),
    [] as Categoria[],
    'No se pudieron cargar las categorías.',
  );
  return {
    bodegas,
    opcionesDeBodegas: computed(() => opcionesDeFiltro(bodegas.value, 'Todas las bodegas')),
    opcionesDeCategorias: computed(() => opcionesDeFiltro(categorias.value, 'Todas las categorías')),
    hayBodegas: verBodegas,
    hayCategorias: verCategorias,
  };
}
