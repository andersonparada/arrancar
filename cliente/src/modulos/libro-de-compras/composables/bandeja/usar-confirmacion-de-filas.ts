import { computed, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiDteRecibidos, type DteRecibido, type ResultadoDeConfirmacion } from '../../servicios/dte-recibidos.api';
import type { RespuestasFiscales } from '../documentos/preguntas-fiscales';
import { FILAS_POR_CONFIRMACION, enGrupos, resumenDeLaSeleccion } from './datos-de-la-bandeja';
import { datosFiscalesContestadosPorNit, separarResultados } from './datos-de-la-confirmacion';
import { usarVistaPreviaDeFilas } from './usar-vista-previa-de-filas';

/** Confirma de a grupos que acepta el servidor, uno tras otro, y junta lo que respondió cada fila. */
async function confirmarEnGrupos(ids: string[], respuestas: Record<string, RespuestasFiscales>) {
  const datosFiscalesPorProveedor = datosFiscalesContestadosPorNit(respuestas);
  const resultados: ResultadoDeConfirmacion[] = [];
  for (const grupo of enGrupos(ids, FILAS_POR_CONFIRMACION)) {
    const respuesta = await apiDteRecibidos.confirmar({ ids: grupo, datosFiscalesPorProveedor });
    resultados.push(...respuesta.resultados);
  }
  return resultados;
}

/** La ventana abierta con las filas marcadas, su vista previa y, al final, el resultado. */
function usarVentanaDeConfirmacion() {
  const filas = ref<DteRecibido[]>([]);
  const abierta = ref(false);
  const resultado = ref<ReturnType<typeof separarResultados> | null>(null);
  const previa = usarVistaPreviaDeFilas(filas);

  async function abrir(marcadas: DteRecibido[]): Promise<void> {
    filas.value = marcadas;
    resultado.value = null;
    previa.reiniciar();
    abierta.value = true;
    await previa.calcular();
  }

  return { filas, abierta, resultado, previa, abrir, cerrar: () => (abierta.value = false) };
}

const textoDeRegistradas = (cantidad: number): string =>
  `Se registró ${cantidad === 1 ? '1 factura' : `${cantidad} facturas`}.`;

/**
 * La ventana «Confirmar»: primero la vista previa de lo marcado, con lo que se creará; luego los resultados fila por
 * fila. Las filas que fallan quedan pendientes y no frenan a las demás.
 */
export function usarConfirmacionDeFilas(alTerminar: (registradas: string[]) => unknown) {
  const avisos = usarAvisos();
  const { enviando, enviar } = usarFormulario();
  const ventana = usarVentanaDeConfirmacion();

  async function confirmar(): Promise<void> {
    const ids = ventana.previa.listas.value.map(({ id }) => id);
    let resultados: ResultadoDeConfirmacion[] = [];
    const hecho = await enviar(async () => {
      resultados = await confirmarEnGrupos(ids, ventana.previa.respuestas.value);
    });
    if (!hecho) return;
    ventana.resultado.value = separarResultados(resultados);
    const registradas = ventana.resultado.value.registradas.map(({ id }) => id);
    if (registradas.length) avisos.exito(textoDeRegistradas(registradas.length));
    await alTerminar(registradas);
  }

  return { ...ventana, enviando, resumen: computed(() => resumenDeLaSeleccion(ventana.filas.value)), confirmar };
}
