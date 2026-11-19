import { computed, ref, watch, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import type { ChequeListado } from '../../servicios/cheques.api';
import {
  alternarMarca,
  depurarSeleccion,
  idsEnOrden,
  marcarTodosDeLaChequera,
  motivoDeBloqueo,
  resumenDeLaSeleccion,
} from './seleccion-para-lote';

/**
 * Elegir varios cheques por imprimir de una misma chequera (hasta 50) e imprimirlos de una vez, en orden de número. Al
 * recargar la lista, lo que ya no se puede imprimir sale de la selección.
 */
export function usarSeleccionParaLote(cheques: Ref<ChequeListado[]>) {
  const router = useRouter();
  const seleccion = ref<string[]>([]);
  const resumen = computed(() => resumenDeLaSeleccion(cheques.value, seleccion.value));
  watch(cheques, (lista) => (seleccion.value = depurarSeleccion(lista, seleccion.value)));

  const estaMarcado = (cheque: ChequeListado): boolean => seleccion.value.includes(cheque.id);
  const bloqueoDe = (cheque: ChequeListado): string | null => motivoDeBloqueo(cheques.value, seleccion.value, cheque);
  const alternar = (cheque: ChequeListado): void => {
    seleccion.value = alternarMarca(cheques.value, seleccion.value, cheque);
  };
  const marcarTodos = (): void => {
    seleccion.value = marcarTodosDeLaChequera(cheques.value, seleccion.value);
  };
  const limpiar = (): void => {
    seleccion.value = [];
  };
  const imprimir = () =>
    router.push({
      name: 'bancos.cheques.imprimir',
      query: { ids: idsEnOrden(cheques.value, seleccion.value).join(',') },
    });

  return { seleccion, resumen, estaMarcado, bloqueoDe, alternar, marcarTodos, limpiar, imprimir };
}
