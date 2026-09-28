import { ref, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiCheques, type Cheque, type EstadoDelCheque } from '../../servicios/cheques.api';

/** Los cheques de una chequera, opcionalmente filtrados por estado; recarga solo al cambiar el filtro. */
export function usarListaDeCheques(chequeraId: string) {
  const estado = ref<EstadoDelCheque | ''>('');
  const {
    datos: cheques,
    cargando,
    cargar,
  } = usarCarga(
    () => apiCheques.listarDeLaChequera(chequeraId, estado.value || undefined),
    [] as Cheque[],
    'No se pudieron cargar los cheques.',
  );
  watch(estado, cargar);

  return { cheques, cargando, cargar, estado };
}
