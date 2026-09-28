import { computed } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { opcionesDeRegistros } from '@/modulos/core/utilidades/edicion';
import { apiBancos, type Banco } from '../../servicios/bancos.api';

/** Lo que se puede elegir en los selectores de la ventana de la cuenta bancaria. */
export function usarReferenciasDeCuentaBancaria() {
  const { datos: bancos } = usarCarga(() => apiBancos.listar(), [] as Banco[], 'No se pudieron cargar los bancos.');
  return computed(() => ({
    bancoId: opcionesDeRegistros(bancos.value, (banco) => String(banco.nombre), true),
  }));
}
