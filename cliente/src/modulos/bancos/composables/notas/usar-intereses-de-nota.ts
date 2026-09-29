import { computed, watch, type ComputedRef, type Ref } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import type { Concepto } from '../../servicios/conceptos.api';
import type { EdicionDeNota } from './edicion-de-nota';
import { isrPropuesto, netoDeIntereses, TASA_DE_ISR_POR_OMISION } from './intereses-de-nota';

/**
 * Propone el ISR al cambiar el interés bruto, mientras el usuario no lo haya cambiado a mano: solo se sobrescribe si
 * está vacío o si todavía es la última propuesta. Al abrir la ventana se olvida la propuesta anterior.
 */
function proponerElIsr(edicion: Ref<EdicionDeNota>, pide: ComputedRef<boolean>): void {
  const tasa = usarSesion().config('bancos.intereses.tasa_isr', TASA_DE_ISR_POR_OMISION);
  let ultimaPropuesta = '';
  watch(
    () => edicion.value.abierta,
    () => (ultimaPropuesta = ''),
  );
  watch(
    () => edicion.value.interesBruto,
    (bruto) => {
      const actual = String(edicion.value.isrRetenido);
      if (!pide.value || (actual !== '' && actual !== ultimaPropuesta)) return;
      ultimaPropuesta = isrPropuesto(bruto, tasa);
      edicion.value.isrRetenido = ultimaPropuesta;
    },
  );
}

/**
 * Los datos de intereses de la ventana de la nota (H8): si el concepto elegido los pide, propone el ISR y el monto pasa
 * a ser el neto (bruto - ISR). Si el concepto deja de pedirlos, los borra para que no viajen al servidor.
 */
export function usarInteresesDeNota(edicion: Ref<EdicionDeNota>, conceptos: Ref<Concepto[]>) {
  const pideIntereses = computed(
    () => conceptos.value.find((concepto) => concepto.id === edicion.value.conceptoId)?.pideDatosDeIntereses ?? false,
  );
  proponerElIsr(edicion, pideIntereses);

  watch([() => edicion.value.interesBruto, () => edicion.value.isrRetenido], ([bruto, isr]) => {
    if (pideIntereses.value) edicion.value.monto = netoDeIntereses(bruto, isr);
  });
  watch(pideIntereses, (pide) => {
    if (pide) return;
    edicion.value.interesBruto = '';
    edicion.value.isrRetenido = '';
  });

  return { pideIntereses };
}
