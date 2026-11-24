import { watch, type Ref } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarLecturaDeSeccion } from '@/modulos/core/composables/usar-lectura-de-seccion';
import { apiDatosFiscalesDeCliente, type DatosFiscalesDeCliente } from '../../servicios/datos-fiscales-de-cliente.api';
import {
  fiscalesDeClienteDesde,
  fiscalesDeClientePorOmision,
  type FiscalesDeCliente,
} from './datos-fiscales-de-cliente';

/** Trae los datos fiscales del cliente que se edita al `v-model` de la sección (o los de omisión si aún no lo es). */
export function usarFiscalesDeCliente(modelo: Ref<FiscalesDeCliente | undefined>, registroId: () => string | null) {
  return usarLecturaDeSeccion(modelo, {
    registroId,
    traer: async (id) => fiscalesDeClienteDesde(await apiDatosFiscalesDeCliente.obtener(id)),
    porOmision: fiscalesDeClientePorOmision,
  });
}

/** Lee los datos fiscales de un cliente para su ficha y los vuelve a leer si cambia el cliente. */
export function usarFichaFiscalDeCliente(clienteId: () => string) {
  const carga = usarCarga(
    () => apiDatosFiscalesDeCliente.obtener(clienteId()),
    null as DatosFiscalesDeCliente | null,
    'No se pudieron cargar los datos fiscales del cliente.',
  );
  watch(clienteId, carga.cargar);
  return carga;
}
