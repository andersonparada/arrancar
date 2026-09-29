import { computed, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiChequesCaducos, type ReporteDeChequesCaducos } from '../../servicios/cheques-caducos.api';
import { fechaDeHoy } from '../comunes/baja-de-registro';
import {
  avisoDeAnulacion,
  conCheque,
  motivoSugerido,
  problemasDelError,
  seleccionDeTodos,
  seleccionVigente,
  textoDeProblemas,
  totalDeLaSeleccion,
} from './seleccion-de-cheques-caducos';

/** Los cheques marcados del reporte, su total y las casillas; al recargar se olvidan los que ya no están. */
function usarSeleccion(reporte: Ref<ReporteDeChequesCaducos>) {
  const seleccion = ref<string[]>([]);
  watch(reporte, ({ cheques }) => (seleccion.value = seleccionVigente(cheques, seleccion.value)));

  const total = computed(() => totalDeLaSeleccion(reporte.value.cheques, seleccion.value));
  const todosMarcados = computed(
    () => reporte.value.cheques.length > 0 && seleccion.value.length === reporte.value.cheques.length,
  );
  const marcar = (chequeId: string, marcado: boolean) =>
    (seleccion.value = conCheque(seleccion.value, chequeId, marcado));
  const marcarTodos = (marcado: boolean) => (seleccion.value = seleccionDeTodos(reporte.value.cheques, marcado));
  return { seleccion, total, todosMarcados, marcar, marcarTodos };
}

/** Lo que se escribe en la ventana: fecha común, motivo sugerido con el plazo de la empresa y la casilla de confirmar. */
function usarDatosDeLaVentana(mesesDeLaEmpresa: number) {
  const abierta = ref(false);
  const motivo = ref('');
  const fecha = ref('');
  const confirmado = ref(false);
  const problemas = ref<string[]>([]);

  function abrir(): void {
    motivo.value = motivoSugerido(mesesDeLaEmpresa);
    fecha.value = fechaDeHoy();
    confirmado.value = false;
    problemas.value = [];
    abierta.value = true;
  }
  return { abierta, motivo, fecha, confirmado, problemas, abrir };
}

interface Opciones {
  reporte: Ref<ReporteDeChequesCaducos>;
  mesesDeLaEmpresa: number;
  alTerminar: () => Promise<void>;
}

/**
 * La selección de cheques del reporte y la ventana de anulación en lote: fecha común, motivo y una casilla
 * que confirma que se entiende lo que se va a crear. Al anular, el servidor lo hace todo o nada.
 */
export function usarAnulacionDeChequesCaducos({ reporte, mesesDeLaEmpresa, alTerminar }: Opciones) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const seleccion = usarSeleccion(reporte);
  const datos = usarDatosDeLaVentana(mesesDeLaEmpresa);

  async function mandar(): Promise<void> {
    const chequeIds = seleccion.seleccion.value;
    try {
      await apiChequesCaducos.anularEnLote({ chequeIds, motivo: datos.motivo.value, fecha: datos.fecha.value });
    } catch (error) {
      datos.problemas.value = textoDeProblemas(reporte.value.cheques, problemasDelError(error));
      // Los problemas ya se muestran por cheque: al formulario solo llega el mensaje general.
      throw datos.problemas.value.length > 0 && error instanceof Error ? new Error(error.message) : error;
    }
  }

  async function anular(): Promise<void> {
    if (!datos.confirmado.value || !(await enviar(mandar))) return;
    avisos.exito(avisoDeAnulacion(seleccion.total.value.cantidad));
    datos.abierta.value = false;
    seleccion.marcarTodos(false);
    await alTerminar();
  }

  return { ...seleccion, ventana: { ...datos, errores, enviando, anular } };
}
