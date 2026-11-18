import { computed, ref } from 'vue';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiDteRecibidos, type DteRecibido } from '../../servicios/dte-recibidos.api';
import { confirmarPorTandas, textoDelAvance, type CorteDeTandas } from './confirmar-por-tandas';
import { resumenDeLaSeleccion } from './datos-de-la-bandeja';
import { datosFiscalesContestadosPorNit, separarResultados } from './datos-de-la-confirmacion';
import { proveedoresNuevosParaEnviar } from './datos-de-proveedores-nuevos';
import { usarVistaPreviaDeFilas } from './usar-vista-previa-de-filas';

/** Lo que pasó al confirmar: lo registrado, lo que quedó pendiente con su error y, si el envío se cortó, dónde. */
export type ResultadoDeLaConfirmacion = ReturnType<typeof separarResultados> & { corte: CorteDeTandas | null };

/** La ventana abierta con las filas marcadas, su vista previa y, al final, el resultado. */
function usarVentanaDeConfirmacion() {
  const filas = ref<DteRecibido[]>([]);
  const abierta = ref(false);
  const resultado = ref<ResultadoDeLaConfirmacion | null>(null);
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

type Ventana = ReturnType<typeof usarVentanaDeConfirmacion>;

/** Envía lo que la vista previa aceptó en tandas de 100, con lo contestado y lo escrito de los proveedores nuevos. */
function enviarLoAceptado({ previa }: Ventana, alAvanzar: (texto: string) => void) {
  const ids = previa.listas.value.map(({ id }) => id);
  const proveedoresNuevos = proveedoresNuevosParaEnviar(previa.proveedoresNuevos.edicion.value);
  const datosFiscalesPorProveedor = datosFiscalesContestadosPorNit(previa.respuestas.value);
  const enviarTanda = async (lote: string[]) =>
    (await apiDteRecibidos.confirmar({ ids: lote, datosFiscalesPorProveedor, proveedoresNuevos })).resultados;
  return confirmarPorTandas(ids, enviarTanda, (avance) => alAvanzar(textoDelAvance(avance)));
}

/**
 * La ventana «Confirmar»: primero la vista previa de lo marcado, con lo que se creará; luego los resultados fila por
 * fila. Las filas que fallan quedan pendientes y no frenan a las demás. Se envía en tandas de 100 con avance visible.
 */
export function usarConfirmacionDeFilas(alTerminar: (registradas: string[]) => unknown) {
  const { enviando, enviar } = usarFormulario();
  const ventana = usarVentanaDeConfirmacion();
  const avance = ref<string | null>(null);

  async function confirmar(): Promise<void> {
    if (ventana.previa.proveedoresNuevos.pedirCorreccion()) return;
    const hecho = await enviar(async () => {
      const { resultados, corte } = await enviarLoAceptado(ventana, (texto) => (avance.value = texto));
      ventana.resultado.value = { ...separarResultados(resultados), corte };
    });
    avance.value = null;
    if (hecho && ventana.resultado.value) await alTerminar(ventana.resultado.value.registradas.map(({ id }) => id));
  }

  const resumen = computed(() => resumenDeLaSeleccion(ventana.filas.value));
  return { ...ventana, enviando, avance, resumen, confirmar };
}
