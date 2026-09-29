import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiNotas } from '../../servicios/notas.api';
import {
  loteDeSugerencias,
  type LoteDeSugerencias,
  type SugerenciasPorMovimiento,
} from '../sugerencias/lote-de-sugerencias';

type Fila = Parameters<typeof loteDeSugerencias>[0][number];

const mensajeDe = (error: unknown): string => (error instanceof Error ? error.message : 'No se pudo clasificar.');

/**
 * Aceptar lo que propone el servidor. «Usar» (un movimiento) es la confirmación en sí: un clic y se clasifica.
 * Aceptar varios abre primero una ventana con el resumen por concepto y una casilla de confirmación. Todo va
 * por `reclasificar-varios` con `porSugerencia`, que deja anotado en la auditoría que fue una sugerencia aceptada.
 */
export function usarAceptacionDeSugerencias(alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const enviando = ref(false);

  async function enviar(asignaciones: LoteDeSugerencias['asignaciones']): Promise<boolean> {
    enviando.value = true;
    try {
      await apiNotas.reclasificarVarios({ asignaciones, porSugerencia: true });
      await alTerminar();
      return true;
    } catch (error) {
      avisos.error(mensajeDe(error));
      return false;
    } finally {
      enviando.value = false;
    }
  }

  async function usar(movimientoId: string, conceptoId: string, conceptoNombre: string): Promise<void> {
    if (await enviar([{ movimientoId, conceptoId }])) avisos.exito(`Clasificado como «${conceptoNombre}».`);
  }

  return { enviando, usar, ...usarLoteDeSugerencias(enviar) };
}

/** La ventana del lote: se arma con lo marcado, pide la casilla y, al confirmar, envía todo junto. */
function usarLoteDeSugerencias(enviar: (asignaciones: LoteDeSugerencias['asignaciones']) => Promise<boolean>) {
  const avisos = usarAvisos();
  const lote = ref<LoteDeSugerencias | null>(null);
  const confirmado = ref(false);

  function abrirLote(
    filas: readonly Fila[],
    seleccion: ReadonlySet<string>,
    sugerencias: SugerenciasPorMovimiento,
  ): void {
    const armado = loteDeSugerencias(filas, seleccion, sugerencias);
    if (!armado.asignaciones.length) return;
    confirmado.value = false;
    lote.value = armado;
  }

  async function confirmarLote(): Promise<void> {
    const actual = lote.value;
    if (!actual || !confirmado.value) return;
    if (!(await enviar(actual.asignaciones))) return;
    avisos.exito(`${actual.asignaciones.length} movimientos clasificados.`);
    lote.value = null;
  }

  return { lote, confirmado, abrirLote, confirmarLote, cerrarLote: () => (lote.value = null) };
}
