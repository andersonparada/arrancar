import { computed, type Ref } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiArticulos, type ConceptoParaArticulo } from '../../servicios/articulos.api';
import { apiBodegas, type Bodega } from '../../servicios/bodegas.api';
import { apiUbicaciones, type DepartamentoParaElegir, type LocalidadParaElegir } from '../../servicios/ubicaciones.api';
import {
  bodegaUnica,
  opcionesDeBodegasActivas,
  opcionesDeConceptos,
  opcionesDeDepartamentosActivos,
  opcionesDeLocalidadesActivas,
} from './opciones-de-documento';

/** Las bodegas del encabezado; con una sola, el formulario la elige solo. */
export function usarBodegasDeDocumento(alCargar: (bodegaUnicaId: string | null) => void) {
  const { datos: bodegas } = usarCarga(
    async () => {
      const lista = await apiBodegas.listar();
      alCargar(bodegaUnica(lista));
      return lista;
    },
    [] as Bodega[],
    'No se pudieron cargar las bodegas.',
  );
  return computed(() => opcionesDeBodegasActivas(bodegas.value));
}

/** Localidades y departamentos (centro de costo): solo se piden a quien los ve en Empresas. */
function usarCentrosDeCosto(localidadId: Ref<string | null>) {
  const sesion = usarSesion();
  const verLocalidades = sesion.puede('empresas.localidades.ver');
  const verDepartamentos = sesion.puede('empresas.departamentos.ver');
  const { datos: localidades } = usarCarga(
    async () => (verLocalidades ? apiUbicaciones.localidades() : []),
    [] as LocalidadParaElegir[],
    'No se pudieron cargar las localidades.',
  );
  const { datos: departamentos } = usarCarga(
    async () => (verDepartamentos ? apiUbicaciones.departamentos() : []),
    [] as DepartamentoParaElegir[],
    'No se pudieron cargar los departamentos.',
  );
  return {
    verLocalidades,
    verDepartamentos,
    localidades: computed(() => opcionesDeLocalidadesActivas(localidades.value)),
    departamentos: computed(() => opcionesDeDepartamentosActivos(departamentos.value, localidadId.value)),
  };
}

/** Lo que la salida necesita para su destino: conceptos de gasto del libro y, si se ven, el centro de costo. */
export function usarDestinosDeSalida(localidadId: Ref<string | null>) {
  const { datos: conceptos } = usarCarga(
    () => apiArticulos.conceptosDeGasto(),
    [] as ConceptoParaArticulo[],
    'No se pudieron cargar los conceptos de gasto.',
  );
  return {
    ...usarCentrosDeCosto(localidadId),
    conceptos: computed(() => opcionesDeConceptos(conceptos.value)),
  };
}
