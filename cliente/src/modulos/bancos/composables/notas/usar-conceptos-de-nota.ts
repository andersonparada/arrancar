import { computed, watch, type Ref } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiSugerencias } from '../../servicios/sugerencias.api';
import { conceptoVigente, opcionesDeConcepto } from '../conceptos/opciones-de-concepto';
import { usarCatalogoDeConceptos } from '../conceptos/usar-catalogo-de-conceptos';
import { usarSugerenciaAlCapturar } from '../sugerencias/usar-sugerencia-al-capturar';
import type { EdicionDeNota } from './edicion-de-nota';

/**
 * El concepto en la ventana de la nota: ofrece los que caben según el tipo (más el que ya tenía la nota, aunque hoy
 * esté inactivo), limpia la elección si al cambiar de tipo deja de servir y, al registrar una nota nueva, propone
 * el concepto que calcula el servidor con el beneficiario o la referencia (sin pisar lo ya elegido).
 */
export function usarConceptosDeNota(edicion: Ref<EdicionDeNota>, conceptoGuardado: Ref<string | null>) {
  const sesion = usarSesion();
  const { conceptos } = usarCatalogoDeConceptos();
  const paraElegir = computed(() => opcionesDeConcepto(conceptos.value, [edicion.value.tipo]));
  const opcionesDeConceptos = computed(() =>
    opcionesDeConcepto(conceptos.value, [edicion.value.tipo], conceptoGuardado.value),
  );
  const { sugerencia } = usarSugerenciaAlCapturar({
    edicion,
    opciones: paraElegir,
    pregunta: (datos) => apiSugerencias.paraNota({ ...datos, tipo: edicion.value.tipo }),
    habilitada: () => edicion.value.abierta && !edicion.value.id && sesion.puede('bancos.notas.crear'),
  });

  watch(
    () => edicion.value.tipo,
    () => (edicion.value.conceptoId = conceptoVigente(paraElegir.value, edicion.value.conceptoId)),
  );

  return { opcionesDeConceptos, sugerencia };
}
