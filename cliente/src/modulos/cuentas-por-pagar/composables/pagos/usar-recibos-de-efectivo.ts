import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiPagos, type ComprobanteDePago } from '../../servicios/pagos.api';
import { idsQueFaltan, tituloDelPapelDeLosRecibos } from './recibos-de-efectivo';

/** Trae los comprobantes de los pagos pedidos; el que falle se cuenta aparte y no impide imprimir los demás. */
async function traerLosRecibos(ids: string[]): Promise<ComprobanteDePago[]> {
  const respuestas = await Promise.allSettled(ids.map((id) => apiPagos.comprobante(id)));
  return respuestas.flatMap((respuesta) => (respuesta.status === 'fulfilled' ? [respuesta.value] : []));
}

/** Los recibos de un reparto listos para imprimir; imprimirlos no cambia nada en el sistema. */
export function usarRecibosDeEfectivo(ids: () => string[]) {
  const faltan = ref<string[]>([]);
  const { datos: recibos, cargando } = usarCarga<ComprobanteDePago[]>(
    async () => {
      const pedidos = ids();
      const traidos = await traerLosRecibos(pedidos);
      faltan.value = idsQueFaltan(pedidos, traidos);
      return traidos;
    },
    [],
    'No se pudieron preparar los recibos.',
  );

  const titulo = document.title;
  watch(recibos, (listos) => {
    if (listos.length > 0) document.title = tituloDelPapelDeLosRecibos(listos);
  });
  onBeforeUnmount(() => (document.title = titulo));

  const imprimir = async (): Promise<void> => {
    await nextTick();
    window.print();
  };
  return { recibos, cargando, faltan, imprimir };
}
