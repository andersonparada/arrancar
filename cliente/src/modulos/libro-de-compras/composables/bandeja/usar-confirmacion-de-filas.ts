import { computed, ref } from 'vue';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiDteRecibidos, type DteRecibido } from '../../servicios/dte-recibidos.api';
import { confirmarPorTandas, textoDelAvance, type CorteDeTandas } from './confirmar-por-tandas';
import { comprobarLaTandaCortada } from './comprobar-la-tanda-cortada';
import { MAXIMO_POR_CONFIRMACION, resumenDeLaSeleccion } from './datos-de-la-bandeja';
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
  /** Cuántas de las marcadas no caben en esta ventana: siguen marcadas para la siguiente. */
  const sinIncluir = ref(0);
  const previa = usarVistaPreviaDeFilas(filas);

  async function abrir(marcadas: DteRecibido[]): Promise<void> {
    filas.value = marcadas.slice(0, MAXIMO_POR_CONFIRMACION);
    sinIncluir.value = marcadas.length - filas.value.length;
    resultado.value = null;
    previa.reiniciar();
    abierta.value = true;
    await previa.calcular();
  }

  return { filas, abierta, resultado, previa, sinIncluir, abrir, cerrar: () => (abierta.value = false) };
}

type Ventana = ReturnType<typeof usarVentanaDeConfirmacion>;

/** Los ids ya registrados: los que contestó el servidor y los que, de la tanda cortada, sí quedaron. */
const registradasEn = ({ registradas, corte }: ResultadoDeLaConfirmacion): string[] => [
  ...registradas.map(({ id }) => id),
  ...(corte?.registradosDeLaTanda ?? []),
];

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
    await enviar(async () => {
      const { resultados, corte } = await enviarLoAceptado(ventana, (texto) => (avance.value = texto));
      avance.value = corte ? 'Comprobando qué alcanzó a registrarse…' : null;
      const comprobado = corte ? await comprobarLaTandaCortada(corte) : null;
      ventana.resultado.value = { ...separarResultados(resultados), corte: comprobado };
    });
    avance.value = null;
    const resultado = ventana.resultado.value;
    if (resultado) await alTerminar(registradasEn(resultado));
  }

  const resumen = computed(() => resumenDeLaSeleccion(ventana.filas.value));
  return { ...ventana, enviando, avance, resumen, confirmar };
}
