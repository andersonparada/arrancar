import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import {
  apiDteRecibidos,
  type DatosFiscalesPorProveedor,
  type DteRecibido,
  type ProveedorNuevoPedido,
  type ResultadoDeVistaPrevia,
} from '../../servicios/dte-recibidos.api';
import type { RespuestasFiscales } from '../documentos/preguntas-fiscales';
import { FILAS_POR_CONFIRMACION, enGrupos } from './datos-de-la-bandeja';
import { proveedoresNuevosParaEnviar } from './datos-de-proveedores-nuevos';
import { usarProveedoresNuevos } from './usar-proveedores-nuevos';
import {
  datosFiscalesContestadosPorNit,
  faltanRespuestas,
  proveedoresConPreguntas,
  separarVistaPrevia,
} from './datos-de-la-confirmacion';

/** Pide la vista previa de todas las filas, en los grupos que acepta el servidor. */
async function pedirVistaPrevia(
  filas: readonly DteRecibido[],
  datos: DatosFiscalesPorProveedor,
  proveedoresNuevos: Record<string, ProveedorNuevoPedido>,
) {
  const grupos = enGrupos(filas, FILAS_POR_CONFIRMACION);
  const respuestas = await Promise.all(
    grupos.map((grupo) =>
      apiDteRecibidos.vistaPrevia({
        ids: grupo.map(({ id }) => id),
        datosFiscalesPorProveedor: datos,
        proveedoresNuevos,
      }),
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

/** El cálculo: pide la vista previa con lo contestado y lo escrito de los proveedores nuevos, y deja al día su edición. */
function usarCalculo(
  filas: Ref<DteRecibido[]>,
  respuestas: Ref<Record<string, RespuestasFiscales>>,
  proveedoresNuevos: ReturnType<typeof usarProveedoresNuevos>,
) {
  const avisos = usarAvisos();
  const resultados = ref<ResultadoDeVistaPrevia[]>([]);
  const calculando = ref(false);

  async function calcular(): Promise<void> {
    calculando.value = true;
    try {
      const datos = datosFiscalesContestadosPorNit(respuestas.value);
      const nuevos = proveedoresNuevosParaEnviar(proveedoresNuevos.edicion.value);
      resultados.value = await pedirVistaPrevia(filas.value, datos, nuevos);
      proveedoresNuevos.sincronizar(resultados.value, filas.value);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo calcular la vista previa.');
    }
    calculando.value = false;
  }

  return { resultados, calculando, calcular };
}

/**
 * Lo que pasaría si se confirmaran las filas: el cálculo de cada una, sus errores, las preguntas sobre los
 * proveedores sin datos fiscales y los proveedores nuevos por crear. Al contestar o cambiar algo hay que volver a calcular.
 */
export function usarVistaPreviaDeFilas(filas: Ref<DteRecibido[]>) {
  const respuestas = ref<Record<string, RespuestasFiscales>>({});
  const proveedoresNuevos = usarProveedoresNuevos();
  const { resultados, calculando, calcular } = usarCalculo(filas, respuestas, proveedoresNuevos);

  function reiniciar(): void {
    resultados.value = [];
    respuestas.value = {};
    proveedoresNuevos.reiniciar();
  }

  const lectura = usarLecturaDeLaVistaPrevia(filas, resultados, respuestas);
  return { respuestas, calculando, calcular, reiniciar, proveedoresNuevos, ...lectura };
}
