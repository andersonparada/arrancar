import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import {
  apiDteRecibidos,
  type DatosFiscalesPorProveedor,
  type DteRecibido,
  type ResultadoDeVistaPrevia,
} from '../../servicios/dte-recibidos.api';
import type { RespuestasFiscales } from '../documentos/preguntas-fiscales';
import { FILAS_POR_CONFIRMACION, enGrupos } from './datos-de-la-bandeja';
import {
  datosFiscalesContestadosPorNit,
  faltanRespuestas,
  proveedoresConPreguntas,
  separarVistaPrevia,
} from './datos-de-la-confirmacion';

/** Pide la vista previa de todas las filas, en los grupos que acepta el servidor. */
async function pedirVistaPrevia(filas: readonly DteRecibido[], datos: DatosFiscalesPorProveedor) {
  const grupos = enGrupos(filas, FILAS_POR_CONFIRMACION);
  const respuestas = await Promise.all(
    grupos.map((grupo) =>
      apiDteRecibidos.vistaPrevia({ ids: grupo.map(({ id }) => id), datosFiscalesPorProveedor: datos }),
    ),
  );
  return respuestas.flatMap(({ resultados }) => resultados);
}

/** Lo que se lee de la vista previa: las filas listas, las que traen error y las preguntas sobre los proveedores. */
function usarLecturaDeLaVistaPrevia(
  filas: Ref<DteRecibido[]>,
  resultados: Ref<ResultadoDeVistaPrevia[]>,
  respuestas: Ref<Record<string, RespuestasFiscales>>,
) {
  const separados = computed(() => separarVistaPrevia(resultados.value));
  const proveedores = computed(() => proveedoresConPreguntas(separados.value.conError, filas.value));
  return {
    listas: computed(() => separados.value.listas),
    conError: computed(() => separados.value.conError),
    proveedores,
    faltaContestar: computed(() => faltanRespuestas(proveedores.value, respuestas.value)),
  };
}

/**
 * Lo que pasaría si se confirmaran las filas: el cálculo de cada una, sus errores y las preguntas sobre los
 * proveedores sin datos fiscales. Al contestarlas hay que volver a calcular.
 */
export function usarVistaPreviaDeFilas(filas: Ref<DteRecibido[]>) {
  const avisos = usarAvisos();
  const resultados = ref<ResultadoDeVistaPrevia[]>([]);
  const respuestas = ref<Record<string, RespuestasFiscales>>({});
  const calculando = ref(false);

  async function calcular(): Promise<void> {
    calculando.value = true;
    try {
      resultados.value = await pedirVistaPrevia(filas.value, datosFiscalesContestadosPorNit(respuestas.value));
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo calcular la vista previa.');
    }
    calculando.value = false;
  }

  function reiniciar(): void {
    resultados.value = [];
    respuestas.value = {};
  }

  return { respuestas, calculando, calcular, reiniciar, ...usarLecturaDeLaVistaPrevia(filas, resultados, respuestas) };
}
