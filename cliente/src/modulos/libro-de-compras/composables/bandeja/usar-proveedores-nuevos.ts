import { computed, ref } from 'vue';
import type { DteRecibido, ResultadoDeVistaPrevia } from '../../servicios/dte-recibidos.api';
import {
  edicionInicial,
  hayProblemas,
  proveedoresNuevosDeLaVistaPrevia,
  type EdicionPorNit,
} from './datos-de-proveedores-nuevos';

/**
 * Los proveedores nuevos de la ventana de confirmar: lo que el usuario escribe de cada NIT, que sobrevive a
 * «Volver a calcular». Los campos con problema se marcan solo después de intentar confirmar.
 */
export function usarProveedoresNuevos() {
  const edicion = ref<EdicionPorNit>({});
  const intentos = ref(0);

  const lista = computed(() =>
    Object.values(edicion.value).sort((a, b) =>
      a.nombreDelDte.localeCompare(b.nombreDelDte, 'es', { sensitivity: 'base' }),
    ),
  );

  function sincronizar(resultados: readonly ResultadoDeVistaPrevia[], filas: readonly DteRecibido[]): void {
    edicion.value = edicionInicial(proveedoresNuevosDeLaVistaPrevia(resultados, filas), edicion.value);
  }

  function reiniciar(): void {
    edicion.value = {};
    intentos.value = 0;
  }

  /** Marca los campos por corregir y avisa a la ventana que lleve el foco al primero. */
  function pedirCorreccion(): boolean {
    if (!hayProblemas(edicion.value)) return false;
    intentos.value++;
    return true;
  }

  return { edicion, lista, intentos, sincronizar, reiniciar, pedirCorreccion };
}
