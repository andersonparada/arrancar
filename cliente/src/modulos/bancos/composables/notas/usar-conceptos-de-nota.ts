import { computed, watch, type Ref } from 'vue';
import type { Movimiento } from '../../servicios/movimientos.api';
import { conceptoVigente, opcionesDeConcepto, sugerirConcepto } from '../conceptos/opciones-de-concepto';
import { usarCatalogoDeConceptos } from '../conceptos/usar-catalogo-de-conceptos';
import type { EdicionDeNota } from './edicion-de-nota';

/**
 * El concepto en la ventana de la nota: ofrece los que caben según el tipo (más el que ya tenía la nota, aunque hoy
 * esté inactivo), limpia la elección si al cambiar de tipo deja de servir y, con un beneficiario escrito y sin
 * concepto elegido, sugiere el último usado con él entre las notas que la pantalla ya tiene (`notasConocidas`).
 */
export function usarConceptosDeNota(
  edicion: Ref<EdicionDeNota>,
  conceptoGuardado: Ref<string | null>,
  notasConocidas: () => Movimiento[],
) {
  const { conceptos } = usarCatalogoDeConceptos();
  const paraElegir = computed(() => opcionesDeConcepto(conceptos.value, [edicion.value.tipo]));
  const opcionesDeConceptos = computed(() =>
    opcionesDeConcepto(conceptos.value, [edicion.value.tipo], conceptoGuardado.value),
  );
  const conceptoSugerido = computed(() => {
    if (edicion.value.conceptoId) return null;
    const id = sugerirConcepto(notasConocidas(), edicion.value.beneficiario, paraElegir.value);
    return paraElegir.value.find((opcion) => opcion.valor === id) ?? null;
  });

  watch(
    () => edicion.value.tipo,
    () => (edicion.value.conceptoId = conceptoVigente(paraElegir.value, edicion.value.conceptoId)),
  );

  return { opcionesDeConceptos, conceptoSugerido };
}
